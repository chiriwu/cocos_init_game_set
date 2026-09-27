import {
    _decorator,
    Button,
    Color,
    Component,
    director,
    Graphics,
    Label,
    Node,
    UITransform
} from 'cc';
import { loadIconFont } from '../../core/IconFont';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import {
    buildGameChromeActionBar,
    buildGameChromeAdStrip,
    GAME_CHROME_SLOTS,
    refreshGameChromeIconLabels,
} from '../../game/chrome/GameChromeBuilder';
import { GAME_CHROME_PALETTE, GAME_DEFAULT_SCREEN } from '../../game/chrome/GameChromeConfig';
import { GAME_CHROME_ACTION_ROW_DEFAULT_H, getAdStripHeight, getBottomActionBarCenterY } from '../../game/chrome/GameChromeLayout';
import { GameFailToast } from '../../game/chrome/GameFailToast';
import { GameHelpDialog, HelpDialogLine, HelpDialogOptions } from '../../game/chrome/GameHelpDialog';
import { GameWinToast } from '../../game/chrome/GameWinToast';
import { LeaderboardPopup } from '../../game/chrome/LeaderboardPopup';
import { IdiomChainCore } from './IdiomChainCore';

const { ccclass } = _decorator;

const PAPER = GAME_CHROME_PALETTE.BOARD_BG;


const TITLE_INK = new Color(35, 44, 48, 255);
const BODY = new Color(80, 90, 95, 255);
const PRIMARY = new Color(90, 114, 123, 255);
const ON_PRIMARY = new Color(247, 245, 240, 255);
const ACCENT = new Color(239, 83, 80, 255);

const NAV_BAR_H = 56;
/** gameArea 顶部 HUD：倒计时 / 答对题数（导航栏下方、GameContainer 上方） */
const HUD_TOP_MARGIN = 10;
const HUD_ROW_H = 58;
const HUD_CONTAINER_GAP = 10;
const HUD_BLOCK_W = 72;
const HUD_BLOCK_H = 58;
const HUD_MUTED = new Color(137, 150, 156, 255);
const HUD_SCORE_ACCENT = new Color(64, 158, 255, 255);
const HUD_CARD_STROKE = new Color(214, 228, 240, 255);

/** 字块网格：单元格与间距（与 _setCharCellHighlighted / _resetCharButtons 一致） */
const CHAR_GRID_CELL = 72;
const CHAR_GRID_GAP = 22;
const CHAR_LABEL_FONT = 36;
const CHAR_LABEL_LINE = 44;

@ccclass('IdiomChainFramework')
export class IdiomChainFramework extends Component {
    private _core: IdiomChainCore | null = null;
    private _levelLabel: Label | null = null;
    private _currentIdiomLabel: Label | null = null;
    private _timerLabel: Label | null = null;
    private _timeRemaining: number = 30;
    private _timerInterval: number = 0;
    private _charButtons: Node[][] = [];
    /** 下划线四个位置，与界面槽位一一对应；`null` 表示空 */
    private _answerSlots: (string | null)[] = [null, null, null, null];
    /** 选中的具体宫格节点 → 填入的下划线索引（相同字不同格为不同键） */
    private _cellNodeToSlotIndex: Map<Node, number> = new Map();
    private _isGameEnded: boolean = false;
    /** 是否处于错误状态（答案错误但未清空） */
    private _isErrorState: boolean = false;
    /** 已完成题数（右侧数字），从 0 起每答对一题 +1 */
    private _completedPuzzleCount: number = 0;

    onLoad(): void {
        loadIconFont(() => {
            const slot = this.node;
            const slotUt = slot.getComponent(UITransform);
            const cw = slotUt?.width ?? GAME_DEFAULT_SCREEN.WIDTH;
            const ch = slotUt?.height ?? GAME_DEFAULT_SCREEN.HEIGHT;
            const layer = slot.layer;

            this._buildRoot(slot, layer, cw, ch);
        });
    }

    onDestroy(): void {
        this._stopTimer();
        if (this._core) {
            this._core.reset();
        }
    }

    /** 离开本场景前必须停表，否则 interval 仍回调已销毁节点 */
    private _exitToLobby(): void {
        this._stopTimer();
        director.loadScene('Lobby');
    }

    private _buildRoot(parent: Node, layer: number, cw: number, ch: number): void {
        const root = new Node('IdiomChainRoot');
        root.parent = parent;
        root.layer = layer;
        const rootUt = root.addComponent(UITransform);
        rootUt.setContentSize(cw, ch);
        rootUt.setAnchorPoint(0.5, 0.5);

        const navBar = this._buildNavBar(root, layer, cw, ch);
        const gamePage = this._buildGamePage(root, layer, cw, ch);
        navBar.setPosition(0, ch * 0.5 - NAV_BAR_H * 0.5, 0);
        gamePage.setPosition(0, -NAV_BAR_H * 0.5, 0);

        // 界面构建完成后自动开始游戏
        setTimeout(() => {
            this._startGame();
        }, 100);
    }

    private _buildNavBar(parent: Node, layer: number, cw: number, ch: number): Node {
        const nb = new Node('NavBar');
        nb.parent = parent;
        nb.layer = layer;
        const nbUt = nb.addComponent(UITransform);
        nbUt.setContentSize(cw, NAV_BAR_H);
        nbUt.setAnchorPoint(0.5, 0.5);

        const nbBg = new Node('NavBarBg');
        nbBg.parent = nb;
        nbBg.layer = layer;
        const nbBgUt = nbBg.addComponent(UITransform);
        nbBgUt.setContentSize(cw, NAV_BAR_H);
        nbBgUt.setAnchorPoint(0.5, 0.5);
        const nbG = nbBg.addComponent(Graphics);
        nbG.fillColor = PAPER;
        nbG.rect(-cw * 0.5, -NAV_BAR_H * 0.5, cw, NAV_BAR_H);
        nbG.fill();
        return nb;
    }

    private _buildGamePage(parent: Node, layer: number, cw: number, ch: number): Node {
        const page = new Node('GamePage');
        page.parent = parent;
        page.layer = layer;
        const pageUt = page.addComponent(UITransform);
        pageUt.setContentSize(cw, ch);
        pageUt.setAnchorPoint(0.5, 0.5);

        const pageBg = new Node('PageBg');
        pageBg.parent = page;
        pageBg.layer = layer;
        const pbUt = pageBg.addComponent(UITransform);
        pbUt.setContentSize(cw, ch);
        pbUt.setAnchorPoint(0.5, 0.5);
        const pbG = pageBg.addComponent(Graphics);
        pbG.fillColor = PAPER;
        pbG.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        pbG.fill();

        this._buildGameArea(page, layer, cw, ch);

        this._mountBottomChrome(page, layer, cw, ch);

        return page;
    }

    private _buildGameArea(parent: Node, layer: number, cw: number, ch: number): void {
        const gameArea = new Node('GameArea');
        gameArea.parent = parent;
        gameArea.layer = layer;
        const gaUt = gameArea.addComponent(UITransform);
        const adH = getAdStripHeight();
        const gameAreaH = ch - adH - GAME_CHROME_ACTION_ROW_DEFAULT_H - 40;
        const gameAreaCenter = (-NAV_BAR_H + GAME_CHROME_ACTION_ROW_DEFAULT_H + adH - 40) / 2
        gaUt.setContentSize(cw - 40, gameAreaH);
        gaUt.setAnchorPoint(0.5, 0.5);
        gameArea.setPosition(0,gameAreaCenter , 0);

        const hudBandH = HUD_TOP_MARGIN + HUD_ROW_H + HUD_CONTAINER_GAP;
        const containerH = (gameAreaH - hudBandH) * 0.95;
        const containerCenterY = gameAreaH * 0.5 - hudBandH - containerH * 0.5;
        const hudCenterY = gameAreaH * 0.5 - HUD_TOP_MARGIN - HUD_ROW_H * 0.5;
        const gameAreaW = cw - 40;

        // 倒计时（左）、答对题数（右）
        this._timerLabel = this._buildHudStatBlock(
            gameArea,
            layer,
            -gameAreaW * 0.5 + HUD_BLOCK_W * 0.5 + 6,
            hudCenterY,
            'Timer',
            '倒计时',
            '30',
            TITLE_INK,
        );
        this._levelLabel = this._buildHudStatBlock(
            gameArea,
            layer,
            gameAreaW * 0.5 - HUD_BLOCK_W * 0.5 - 6,
            hudCenterY,
            'Level',
            '答对',
            '0',
            HUD_SCORE_ACCENT,
        );

        // 游戏容器背景（位于 HUD 下方）
        const container = new Node('GameContainer');
        container.parent = gameArea;
        container.layer = layer;
        const containerUt = container.addComponent(UITransform);
        containerUt.setContentSize(cw - 60, containerH);
        containerUt.setAnchorPoint(0.5, 0.5);
        container.setPosition(0, containerCenterY, 0);

        const containerBg = new Node('ContainerBg');
        containerBg.parent = container;
        containerBg.layer = layer;
        const cbUt = containerBg.addComponent(UITransform);
        cbUt.setContentSize(cw - 60, containerH);
        cbUt.setAnchorPoint(0.5, 0.5);
        const cbG = containerBg.addComponent(Graphics);
        cbG.fillColor = Color.WHITE;
        cbG.strokeColor = new Color(100, 180, 255, 255);
        cbG.lineWidth = 2;
        cbG.roundRect(-(cw - 60) * 0.5, -containerH * 0.5, cw - 60, containerH, 16);
        cbG.fill();
        cbG.stroke();

        const innerHH = containerH * 0.5;

        // 标题栏（上一个成语标签）
        const titleBar = new Node('TitleBar');
        titleBar.parent = container;
        titleBar.layer = layer;
        const tbUt = titleBar.addComponent(UITransform);
        tbUt.setContentSize(200, 40);
        tbUt.setAnchorPoint(0.5, 0.5);
        titleBar.setPosition(0, innerHH - 26, 0);

        const titleBarBg = new Node('TitleBarBg');
        titleBarBg.parent = titleBar;
        titleBarBg.layer = layer;
        const tbBgUt = titleBarBg.addComponent(UITransform);
        tbBgUt.setContentSize(200, 40);
        tbBgUt.setAnchorPoint(0.5, 0.5);
        const tbG = titleBarBg.addComponent(Graphics);
        tbG.fillColor = new Color(64, 158, 255, 255);
        tbG.moveTo(-100, -20);
        tbG.lineTo(-80, -20);
        tbG.lineTo(-70, -35);
        tbG.lineTo(70, -35);
        tbG.lineTo(80, -20);
        tbG.lineTo(100, -20);
        tbG.lineTo(80, -5);
        tbG.lineTo(70, 20);
        tbG.lineTo(-70, 20);
        tbG.lineTo(-80, -5);
        tbG.close();
        tbG.fill();

        const titleBarLbNode = new Node('TitleBarLabel');
        titleBarLbNode.parent = titleBar;
        titleBarLbNode.layer = layer;
        const tbLbUt = titleBarLbNode.addComponent(UITransform);
        tbLbUt.setContentSize(200, 40);
        tbLbUt.setAnchorPoint(0.5, 0.5);
        const titleBarLb = titleBarLbNode.addComponent(Label);
        titleBarLb.string = '上一个成语';
        titleBarLb.fontSize = 16;
        titleBarLb.lineHeight = 22;
        titleBarLb.color = Color.WHITE;
        titleBarLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        titleBarLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(titleBarLb);

        // 上一个成语展示区
        const prevIdiomNode = new Node('PrevIdiom');
        prevIdiomNode.parent = container;
        prevIdiomNode.layer = layer;
        const piUt = prevIdiomNode.addComponent(UITransform);
        piUt.setContentSize(cw - 100, 96);
        piUt.setAnchorPoint(0.5, 0.5);
        prevIdiomNode.setPosition(0, innerHH - 88, 0);

        const piLb = prevIdiomNode.addComponent(Label);
        piLb.string = '请开始游戏';
        piLb.fontSize = 38;
        piLb.lineHeight = 48;
        piLb.color = TITLE_INK;
        piLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        piLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(piLb);
        this._currentIdiomLabel = piLb;

        // 分隔线
        const lineNode = new Node('Separator');
        lineNode.parent = container;
        lineNode.layer = layer;
        const lineUt = lineNode.addComponent(UITransform);
        lineUt.setContentSize(cw - 100, 2);
        lineUt.setAnchorPoint(0.5, 0.5);
        lineNode.setPosition(0, innerHH - 152, 0);

        const lineG = lineNode.addComponent(Graphics);
        lineG.strokeColor = new Color(200, 200, 200, 255);
        lineG.lineWidth = 2;
        lineG.moveTo(-(cw - 100) * 0.5, 0);
        lineG.lineTo((cw - 100) * 0.5, 0);
        lineG.stroke();

        const rows = 3;
        const cols = 4;
        const cellSize = CHAR_GRID_CELL;
        const gap = CHAR_GRID_GAP;
        const gridWidth = cols * cellSize + (cols - 1) * gap;
        const gridHeight = rows * cellSize + (rows - 1) * gap;

        // 纵向间距：分割线与答题区、答题区与字块区（顺序与早期版本一致：先答题后选字）
        const GAP_SEP_TO_ANSWER = 52;   // 分隔线到答题区的垂直间距（像素）
        const ANSWER_BAND_H = 72;        // 答题区（下划线区域）的高度（像素）
        const GAP_ANSWER_TO_GRID = 72;   // 答题区到字块网格的垂直间距（像素）
        const ySep = innerHH - 152;      // 分隔线的y坐标（从容器顶部向下偏移152像素）
        const yAnswerCenter = ySep - GAP_SEP_TO_ANSWER - ANSWER_BAND_H * 0.5;
        const yGridCenter = yAnswerCenter - ANSWER_BAND_H * 0.5 - GAP_ANSWER_TO_GRID - gridHeight * 0.5;

        // 答案区（下划线）：紧接在分割线下
        const answerArea = new Node('AnswerArea');
        answerArea.parent = container;
        answerArea.layer = layer;
        const aaUt = answerArea.addComponent(UITransform);
        aaUt.setContentSize(cw - 100, ANSWER_BAND_H);
        aaUt.setAnchorPoint(0.5, 0.5);
        answerArea.setPosition(0, yAnswerCenter, 0);

        const underlineWidth = 56;
        const underlineGap = 24;
        const totalWidth = 4 * underlineWidth + 3 * underlineGap;

        for (let i = 0; i < 4; i++) {
            const slotNode = new Node(`AnswerSlot_${i}`);
            slotNode.parent = answerArea;
            slotNode.layer = layer;
            const slotUt = slotNode.addComponent(UITransform);
            slotUt.setContentSize(underlineWidth, 58);
            slotUt.setAnchorPoint(0.5, 0.5);
            const x = -totalWidth * 0.5 + i * (underlineWidth + underlineGap) + underlineWidth * 0.5;
            slotNode.setPosition(x, 0, 0);

            const slotLbNode = new Node(`SlotLabel_${i}`);
            slotLbNode.parent = slotNode;
            slotLbNode.layer = layer;
            slotLbNode.setPosition(0, 8, 0);
            const slotLbUt = slotLbNode.addComponent(UITransform);
            slotLbUt.setContentSize(underlineWidth, 40);
            slotLbUt.setAnchorPoint(0.5, 0.5);
            const slotLb = slotLbNode.addComponent(Label);
            slotLb.string = '';
            slotLb.fontSize = 32;
            slotLb.lineHeight = 40;
            slotLb.color = new Color(64, 158, 255, 255);
            slotLb.horizontalAlign = Label.HorizontalAlign.CENTER;
            slotLb.verticalAlign = Label.VerticalAlign.CENTER;
            applyGlobalLabelFont(slotLb);

            const underlineNode = new Node('Underline');
            underlineNode.parent = slotNode;
            underlineNode.layer = layer;
            underlineNode.setPosition(0, -16, 0);
            const uUt = underlineNode.addComponent(UITransform);
            uUt.setContentSize(underlineWidth, 14);
            uUt.setAnchorPoint(0.5, 0.5);
            const slotLineG = underlineNode.addComponent(Graphics);
            slotLineG.strokeColor = new Color(64, 158, 255, 255);
            slotLineG.lineWidth = 3;
            slotLineG.moveTo(-underlineWidth * 0.4, 0);
            slotLineG.lineTo(underlineWidth * 0.4, 0);
            slotLineG.stroke();

            const slotBtn = slotNode.addComponent(Button);
            slotBtn.transition = Button.Transition.NONE;
            slotNode.on(Button.EventType.CLICK, () => {
                this._onAnswerSlotClick(i);
            }, this);
        }

        // 文字按钮区域（3×4）：在答题区下方，与答题区间距加大
        const charGrid = new Node('CharGrid');
        charGrid.parent = container;
        charGrid.layer = layer;
        const cgUt = charGrid.addComponent(UITransform);
        cgUt.setContentSize(cw - 80, gridHeight + 36);
        cgUt.setAnchorPoint(0.5, 0.5);
        charGrid.setPosition(0, yGridCenter, 0);

        for (let row = 0; row < rows; row++) {
            this._charButtons[row] = [];
            for (let col = 0; col < cols; col++) {
                const cellBtn = new Node(`CharBtn_${row}_${col}`);
                cellBtn.parent = charGrid;
                cellBtn.layer = layer;
                const cbUt = cellBtn.addComponent(UITransform);
                cbUt.setContentSize(cellSize, cellSize);
                cbUt.setAnchorPoint(0.5, 0.5);
                const x = -gridWidth * 0.5 + col * (cellSize + gap) + cellSize * 0.5;
                const y = gridHeight * 0.5 - row * (cellSize + gap) - cellSize * 0.5;
                cellBtn.setPosition(x, y, 0);

                const cbBg = new Node('CharBg');
                cbBg.parent = cellBtn;
                cbBg.layer = layer;
                const cbbUt = cbBg.addComponent(UITransform);
                cbbUt.setContentSize(cellSize, cellSize);
                cbbUt.setAnchorPoint(0.5, 0.5);
                const cbG = cbBg.addComponent(Graphics);
                cbG.fillColor = Color.WHITE;
                cbG.strokeColor = new Color(200, 200, 200, 255);
                cbG.lineWidth = 2;
                cbG.roundRect(-cellSize * 0.5, -cellSize * 0.5, cellSize, cellSize, 10);
                cbG.fill();
                cbG.stroke();

                const cbLbNode = new Node(`CharLabel_${row}_${col}`);
                cbLbNode.parent = cellBtn;
                cbLbNode.layer = layer;
                cbLbNode.setPosition(0, 0, 0);
                const cbLbUt = cbLbNode.addComponent(UITransform);
                cbLbUt.setContentSize(cellSize, cellSize);
                cbLbUt.setAnchorPoint(0.5, 0.5);

                const cbLb = cbLbNode.addComponent(Label);
                cbLb.string = '';
                cbLb.fontSize = CHAR_LABEL_FONT;
                cbLb.lineHeight = CHAR_LABEL_LINE;
                cbLb.color = TITLE_INK;
                cbLb.horizontalAlign = Label.HorizontalAlign.CENTER;
                cbLb.verticalAlign = Label.VerticalAlign.CENTER;
                applyGlobalLabelFont(cbLb);

                const cbBtn = cellBtn.addComponent(Button);
                cbBtn.transition = Button.Transition.NONE;
                cellBtn.on(Button.EventType.CLICK, () => {
                    this._onCharClick(cbLb.string, cellBtn);
                }, this);

                this._charButtons[row][col] = cellBtn;
            }
        }
    }

    private _startGame(): void {
        if (!this._core) {
            this._core = new IdiomChainCore();
        }
        this._core.startGame();
        this._timeRemaining = 30;
        this._isErrorState = false;  // 重置错误状态
        this._completedPuzzleCount = 0;

        this._startTimer();
        this._updateUI();
        this._clearAnswerArea();
        this._resetCharButtons();  // 重置所有按钮颜色
    }

    private _startTimer(): void {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
        }

        this._refreshTimerHud();
        this._timerInterval = setInterval(() => {
            this._timeRemaining--;
            this._refreshTimerHud();

            if (this._timeRemaining <= 0) {
                this._gameOver();
            }
        }, 1000);
    }

    private _refreshTimerHud(): void {
        if (!this._timerLabel) {
            return;
        }
        this._timerLabel.string = `${this._timeRemaining}`;
        this._timerLabel.color = this._timeRemaining <= 10 ? ACCENT : TITLE_INK;
    }

    private _buildHudStatBlock(
        parent: Node,
        layer: number,
        x: number,
        y: number,
        name: string,
        caption: string,
        value: string,
        valueColor: Color,
    ): Label {
        const block = new Node(name);
        block.parent = parent;
        block.layer = layer;
        block.setPosition(x, y, 0);
        const blockUt = block.addComponent(UITransform);
        blockUt.setContentSize(HUD_BLOCK_W, HUD_BLOCK_H);
        blockUt.setAnchorPoint(0.5, 0.5);

        const bg = new Node('Bg');
        bg.parent = block;
        bg.layer = layer;
        bg.addComponent(UITransform).setContentSize(HUD_BLOCK_W, HUD_BLOCK_H);
        const bgG = bg.addComponent(Graphics);
        bgG.fillColor = Color.WHITE;
        bgG.strokeColor = HUD_CARD_STROKE;
        bgG.lineWidth = 1;
        bgG.roundRect(-HUD_BLOCK_W * 0.5, -HUD_BLOCK_H * 0.5, HUD_BLOCK_W, HUD_BLOCK_H, 12);
        bgG.fill();
        bgG.stroke();

        const captionNode = new Node('Caption');
        captionNode.parent = block;
        captionNode.layer = layer;
        captionNode.setPosition(0, 12, 0);
        const capUt = captionNode.addComponent(UITransform);
        capUt.setContentSize(HUD_BLOCK_W, 18);
        capUt.setAnchorPoint(0.5, 0.5);
        const capLb = captionNode.addComponent(Label);
        capLb.string = caption;
        capLb.fontSize = 12;
        capLb.lineHeight = 16;
        capLb.color = HUD_MUTED;
        capLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        capLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(capLb);

        const valueNode = new Node('Value');
        valueNode.parent = block;
        valueNode.layer = layer;
        valueNode.setPosition(0, -10, 0);
        const valueUt = valueNode.addComponent(UITransform);
        valueUt.setContentSize(HUD_BLOCK_W, 32);
        valueUt.setAnchorPoint(0.5, 0.5);
        const lb = valueNode.addComponent(Label);
        lb.string = value;
        lb.fontSize = 28;
        lb.lineHeight = 32;
        lb.color = valueColor;
        lb.horizontalAlign = Label.HorizontalAlign.CENTER;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(lb);
        return lb;
    }

    private _stopTimer(): void {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = 0;
        }
    }

    private _resetAnswerSlots(): void {
        this._answerSlots = [null, null, null, null];
        this._cellNodeToSlotIndex.clear();
    }

    private _firstEmptySlotIndex(): number {
        return this._answerSlots.findIndex((s) => s == null);
    }

    private _allAnswerSlotsFilled(): boolean {
        return this._answerSlots.every((s) => s != null);
    }

    private _answerStringFromSlots(): string {
        return this._answerSlots.map((s) => s ?? '').join('');
    }

    /** 下标对应的宫格节点（相同字不同格靠 Map 区分） */
    private _findCellNodeBySlotIndex(slotIndex: number): Node | undefined {
        for (const [node, idx] of this._cellNodeToSlotIndex) {
            if (idx === slotIndex) {
                return node;
            }
        }
        return undefined;
    }

    /** 点击下划线槽位：有字则清除该位并取消对应宫格高亮 */
    private _onAnswerSlotClick(slotIndex: number): void {
        if (!this._core || !this._core.isPlaying || this._isGameEnded) {
            return;
        }
        if (slotIndex < 0 || slotIndex >= 4 || this._answerSlots[slotIndex] == null) {
            return;
        }
        const cellNode = this._findCellNodeBySlotIndex(slotIndex);
        if (!cellNode) {
            this._answerSlots[slotIndex] = null;
            this._updateAnswerArea();
            return;
        }
        this._answerSlots[slotIndex] = null;
        this._cellNodeToSlotIndex.delete(cellNode);
        this._setCharCellHighlighted(cellNode, false);
        this._updateAnswerArea();
    }

    private _setCharCellHighlighted(cellNode: Node, highlighted: boolean): void {
        const cbBg = cellNode.getChildByName('CharBg');
        if (cbBg) {
            const cbG = cbBg.getComponent(Graphics);
            if (cbG) {
                if (highlighted) {
                    cbG.fillColor = new Color(64, 158, 255, 255);
                    cbG.strokeColor = new Color(64, 158, 255, 255);
                } else {
                    cbG.fillColor = Color.WHITE;
                    cbG.strokeColor = new Color(200, 200, 200, 255);
                }
                const r = CHAR_GRID_CELL * 0.5;
                cbG.roundRect(-r, -r, CHAR_GRID_CELL, CHAR_GRID_CELL, 10);
                cbG.fill();
                cbG.stroke();
            }
        }
        const cbLbNode = cellNode.children.find((child) => child.name.startsWith('CharLabel_'));
        if (cbLbNode) {
            const cbLb = cbLbNode.getComponent(Label);
            if (cbLb) {
                cbLb.color = highlighted ? Color.WHITE : TITLE_INK;
            }
        }
    }

    private _onCharClick(char: string, cellNode: Node): void {
        if (!this._core || !this._core.isPlaying || this._isGameEnded) {
            return;
        }

        const existingSlot = this._cellNodeToSlotIndex.get(cellNode);
        if (existingSlot !== undefined) {
            this._answerSlots[existingSlot] = null;
            this._cellNodeToSlotIndex.delete(cellNode);
            this._setCharCellHighlighted(cellNode, false);
            // 删除字后重置错误状态
            this._isErrorState = false;
            this._updateAnswerArea();
            return;
        }

        const emptyIdx = this._firstEmptySlotIndex();
        if (emptyIdx < 0) {
            return;
        }

        this._answerSlots[emptyIdx] = char;
        this._cellNodeToSlotIndex.set(cellNode, emptyIdx);
        this._setCharCellHighlighted(cellNode, true);
        this._updateAnswerArea();

        if (this._allAnswerSlotsFilled()) {
            const answer = this._answerStringFromSlots();
            const success = this._core.submitInput(answer);

            if (success) {
                this._completedPuzzleCount++;
                if (this._core.isGameComplete) {
                    this._isGameEnded = true;
                    this._stopTimer();
                    this._showWinToast();
                } else {
                    this._timeRemaining = 30;
                    this._isErrorState = false;
                    this._resetCharButtons();
                    this._clearAnswerArea();
                    this._updateUI();
                }
            } else {
                this._flashError();
                this._isErrorState = true;
                this._updateAnswerArea();
            }
        }
    }

    private _updateAnswerArea(): void {
        const gameArea = this.node.getChildByName('IdiomChainRoot')?.getChildByName('GamePage')?.getChildByName('GameArea');
        if (!gameArea) return;
        
        const container = gameArea.getChildByName('GameContainer');
        if (!container) return;
        
        const answerArea = container.getChildByName('AnswerArea');
        if (!answerArea) return;
        
        // 根据错误状态设置颜色
        const textColor = this._isErrorState ? new Color(239, 83, 80, 255) : new Color(64, 158, 255, 255);
        
        for (let i = 0; i < 4; i++) {
            const slotNode = answerArea.getChildByName(`AnswerSlot_${i}`);
            if (!slotNode) continue;
            
            // 从子节点获取 Label
            const slotLbNode = slotNode.getChildByName(`SlotLabel_${i}`);
            if (!slotLbNode) continue;
            
            const slotLb = slotLbNode.getComponent(Label);
            if (slotLb) {
                slotLb.string = this._answerSlots[i] ?? '';
                slotLb.color = textColor;
            }
        }
    }

    private _clearAnswerArea(): void {
        this._resetAnswerSlots();
        this._updateAnswerArea();
    }

    private _resetCharButtons(): void {
        if (!this._core) return;
        
        const chars = this._core.getCurrentCharButtons();
        let charIndex = 0;
        
        for (let row = 0; row < this._charButtons.length; row++) {
            for (let col = 0; col < this._charButtons[row].length; col++) {
                const cellNode = this._charButtons[row][col];
                if (!cellNode) continue;
                
                const cbBg = cellNode.getChildByName('CharBg');
                if (cbBg) {
                    const cbG = cbBg.getComponent(Graphics);
                    if (cbG) {
                        cbG.fillColor = Color.WHITE;
                        cbG.strokeColor = new Color(200, 200, 200, 255);
                        const r = CHAR_GRID_CELL * 0.5;
                        cbG.roundRect(-r, -r, CHAR_GRID_CELL, CHAR_GRID_CELL, 10);
                        cbG.fill();
                        cbG.stroke();
                    }
                }
                
                // 从子节点获取 Label 并重置
                const cbLbNode = cellNode.children.find(child => child.name.startsWith('CharLabel_'));
                if (cbLbNode) {
                    const cbLb = cbLbNode.getComponent(Label);
                    if (cbLb) {
                        cbLb.color = TITLE_INK;
                        cbLb.string = chars[charIndex] || '';
                    }
                }
                
                const cbBtn = cellNode.getComponent(Button);
                if (cbBtn) {
                    cbBtn.enabled = true;
                }
                
                charIndex++;
            }
        }
    }

    private _flashError(): void {
        // 错误时仅设置错误状态，下划线颜色在 _updateAnswerArea() 中处理
        // 不修改按钮颜色，保持用户选中的高亮状态
    }

    private _updateUI(): void {
        if (this._core) {
            if (this._levelLabel) {
                this._levelLabel.string = `${this._completedPuzzleCount}`;
            }
            if (this._currentIdiomLabel) {
                if (this._core.currentIdiom) {
                    this._currentIdiomLabel.string = this._core.currentIdiom;
                } else {
                    this._currentIdiomLabel.string = '';
                }
            }
            this._refreshTimerHud();
        }
    }

    private _gameOver(): void {
        this._stopTimer();
        if (this._core) {
            this._core.reset();
        }
        console.log('游戏结束');
        this._showFailToast();
    }

    private _showFailToast(): void {
        const parent = this.node.getChildByName('IdiomChainRoot')?.getChildByName('GamePage');
        if (!parent) return;

        const onRetry = () => {
            this._isGameEnded = false;
            this._startGame();
        };

        const onHome = () => {
            this._exitToLobby();
        };

        GameFailToast.show(parent, onRetry, onHome);
    }

    private _showWinToast(): void {
        const parent = this.node.getChildByName('IdiomChainRoot');
        if (!parent) {
            return;
        }

        GameWinToast.show(
            parent,
            () => {
                this._isGameEnded = false;
                this._startGame();
            },
            () => this._exitToLobby(),
            {
                subTitle: '已完成全部成语',
            },
        );
    }

    private _showError(message: string): void {
        console.log('Error:', message);
    }

    private _mountBottomChrome(parent: Node, layer: number, cw: number, ch: number): void {
        buildGameChromeAdStrip(parent, layer, { cw, label: '广告位' });
        const bottomBtnY = getBottomActionBarCenterY(ch);
        const refs = buildGameChromeActionBar(parent, layer, {
            cw,
            centerY: bottomBtnY,
            slots: [
                GAME_CHROME_SLOTS.home(() => this._exitToLobby()),
                GAME_CHROME_SLOTS.leaderboard(() => this._onLeaderboardClicked()),
                GAME_CHROME_SLOTS.help(() => this._onHelpClicked()),
                GAME_CHROME_SLOTS.share('idiom_chain'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    private _onLeaderboardClicked(): void {
        const parent = this.node.getChildByName('IdiomChainRoot');
        if (!parent) {
            return;
        }
        LeaderboardPopup.show(parent);
    }

    private _onHelpClicked(): void {
        const parent = this.node.getChildByName('IdiomChainRoot');
        if (!parent) {
            return;
        }
        const helpLines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '根据上方显示的成语，从字块中选出正确的接龙成语' },
            { text: '操作方法', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '点击字块填入下方答题区，按顺序组成四字成语' },
            { text: '再次点击已选字块，或点击答题区槽位，可撤回该字' },
            { text: '游戏规则', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '四字填完后自动判定；答对进入下一题并重置倒计时' },
            { text: '答错时文字变红，可修改后重新提交' },
            { text: '倒计时归零则本局结束' },
        ];
        this._showHelpDialog(parent, '游戏帮助', helpLines);
    }

    private _showHelpDialog(
        parent: Node,
        title: string,
        lines: HelpDialogLine[],
        options?: HelpDialogOptions,
    ): void {
        GameHelpDialog.show(parent, title, lines, options);
    }

    private _addLabel(parent: Node, name: string, y: number, w: number, h: number, text: string, fontSize: number, lineHeight: number, color: Color, hAlign: number, x = 0): Label {
        const n = new Node(name);
        n.parent = parent;
        n.layer = parent.layer;
        n.setPosition(x, y, 0);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(w, h);
        ut.setAnchorPoint(0.5, 0.5);
        const lb = n.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.lineHeight = lineHeight;
        lb.color = color;
        lb.horizontalAlign = hAlign;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(lb);
        return lb;
    }
}

