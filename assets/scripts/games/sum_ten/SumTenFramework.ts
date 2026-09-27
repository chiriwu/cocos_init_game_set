import {
    _decorator,
    Color,
    Component,
    director,
    EventTouch,
    Graphics,
    Label,
    Node,
    UITransform,
    Vec3,
} from 'cc';
import { loadIconFont } from '../../core/IconFont';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import {
    buildGameChromeActionBar,
    buildGameChromeAdStrip,
    GAME_CHROME_SLOTS,
    refreshGameChromeIconLabels,
} from '../../game/chrome/GameChromeBuilder';
import { GAME_CHROME_PALETTE } from '../../game/chrome/GameChromeConfig';
import {
    GAME_CHROME_ACTION_ROW_DEFAULT_H,
    getAdStripHeight,
    getBottomActionBarCenterY,
} from '../../game/chrome/GameChromeLayout';
import { GameHelpDialog, HelpDialogLine, HelpDialogOptions } from '../../game/chrome/GameHelpDialog';
import { GameWinToast } from '../../game/chrome/GameWinToast';
import { LeaderboardPopup } from '../../game/chrome/LeaderboardPopup';
import { GridRect, SUM_TEN_COLS, SUM_TEN_ROWS, SumTenCore } from './SumTenCore';

const { ccclass } = _decorator;

const NAV_BAR_H = 56;
const HEADER_H = 60;
const GRID_GAP = 2;
const GRID_FRAME = 6;

const DIGIT_COLORS: Record<number, Color> = {
    1: new Color(34, 120, 50, 255),
    2: new Color(120, 120, 120, 255),
    3: new Color(200, 160, 40, 255),
    4: new Color(160, 70, 50, 255),
    5: new Color(220, 60, 150, 255),
    6: new Color(80, 170, 230, 255),
    7: new Color(180, 90, 40, 255),
    8: new Color(130, 190, 50, 255),
    9: new Color(100, 60, 160, 255),
};

const SELECT_FILL = new Color(255, 220, 60, 120);
const SELECT_STROKE = new Color(255, 210, 40, 255);

interface GridPoint {
    row: number;
    col: number;
}

@ccclass('SumTenFramework')
export class SumTenFramework extends Component {
    private _core = new SumTenCore();
    private _layer = 0;
    private _levelLabel: Label | null = null;
    private _gridBoard: Node | null = null;
    private _selectionGfx: Graphics | null = null;
    private _cellNodes: Node[][] = [];
    private _cellSize = 0;
    private _gridW = 0;
    private _gridH = 0;
    private _gridLeft = 0;
    private _gridTop = 0;
    private _dragStart: GridPoint | null = null;
    private _dragEnd: GridPoint | null = null;

    onLoad(): void {
        loadIconFont(() => {
            const slot = this.node;
            const slotUt = slot.getComponent(UITransform);
            const cw = slotUt?.width ?? 750;
            const ch = slotUt?.height ?? 1280;
            this._layer = slot.layer;
            this._buildRoot(slot, this._layer, cw, ch);
        });
    }

    onDestroy(): void {
        this._core.reset();
    }

    private _buildRoot(slot: Node, layer: number, cw: number, ch: number): void {
        const root = new Node('SumTenRoot');
        root.parent = slot;
        root.layer = layer;
        const rootUt = root.addComponent(UITransform);
        rootUt.setContentSize(cw, ch);
        rootUt.setAnchorPoint(0.5, 0.5);
        root.setPosition(0, 0, 0);

        const rootBg = root.addComponent(Graphics);
        rootBg.fillColor = GAME_CHROME_PALETTE.BOARD_BG;
        rootBg.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        rootBg.fill();

        this._buildNavBar(root, layer, cw);
        this._buildHeader(root, layer, cw, ch);
        this._buildGameArea(root, layer, cw, ch);
        this._mountBottomChrome(root, layer, cw, ch);
        this._startLevel();
    }

    private _buildNavBar(parent: Node, layer: number, cw: number): void {
        const nb = new Node('NavBar');
        nb.parent = parent;
        nb.layer = layer;
        const nbUt = nb.addComponent(UITransform);
        nbUt.setContentSize(cw, NAV_BAR_H);
        nbUt.setAnchorPoint(0.5, 0.5);
        nb.setPosition(0, parent.getComponent(UITransform)!.height * 0.5 - NAV_BAR_H * 0.5, 0);

        const nbBg = new Node('NavBg');
        nbBg.parent = nb;
        nbBg.layer = layer;
        const nbBgUt = nbBg.addComponent(UITransform);
        nbBgUt.setContentSize(cw, NAV_BAR_H);
        nbBgUt.setAnchorPoint(0.5, 0.5);
        const nbG = nbBg.addComponent(Graphics);
        nbG.fillColor = GAME_CHROME_PALETTE.BOARD_BG;
        nbG.rect(-cw * 0.5, -NAV_BAR_H * 0.5, cw, NAV_BAR_H);
        nbG.fill();
    }

    private _buildHeader(parent: Node, layer: number, cw: number, ch: number): void {
        const header = new Node('Header');
        header.parent = parent;
        header.layer = layer;
        const hUt = header.addComponent(UITransform);
        hUt.setContentSize(cw, HEADER_H);
        hUt.setAnchorPoint(0.5, 0.5);
        header.setPosition(0, ch * 0.5 - NAV_BAR_H - HEADER_H * 0.5, 0);

        const levelBg = new Node('LevelBg');
        levelBg.parent = header;
        levelBg.layer = layer;
        const lbUt = levelBg.addComponent(UITransform);
        lbUt.setContentSize(160, 40);
        lbUt.setAnchorPoint(0.5, 0.5);
        const lbG = levelBg.addComponent(Graphics);
        lbG.fillColor = new Color(90, 114, 123, 255);
        lbG.roundRect(-80, -20, 160, 40, 8);
        lbG.fill();

        const levelLabel = new Node('LevelLabel');
        levelLabel.parent = levelBg;
        levelLabel.layer = layer;
        const llUt = levelLabel.addComponent(UITransform);
        llUt.setContentSize(160, 40);
        llUt.setAnchorPoint(0.5, 0.5);
        this._levelLabel = levelLabel.addComponent(Label);
        this._levelLabel.string = '关卡 1';
        this._levelLabel.fontSize = 20;
        this._levelLabel.color = Color.WHITE;
        this._levelLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._levelLabel.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(this._levelLabel);
    }

    private _buildGameArea(parent: Node, layer: number, cw: number, ch: number): void {
        const gameArea = new Node('GameArea');
        gameArea.parent = parent;
        gameArea.layer = layer;
        const gaUt = gameArea.addComponent(UITransform);
        const gaH = ch - NAV_BAR_H - HEADER_H - GAME_CHROME_ACTION_ROW_DEFAULT_H - getAdStripHeight() - 48;
        gaUt.setContentSize(cw - 32, gaH);
        gaUt.setAnchorPoint(0.5, 0.5);
        gameArea.setPosition(0, 0, 0);

        const boardPad = 12;
        const innerW = gaUt.width - boardPad * 2;
        const innerH = gaUt.height - boardPad * 2;
        this._cellSize = Math.floor(
            Math.min(
                (innerW - GRID_GAP * (SUM_TEN_COLS - 1)) / SUM_TEN_COLS,
                (innerH - GRID_GAP * (SUM_TEN_ROWS - 1)) / SUM_TEN_ROWS,
            ),
        );
        this._gridW = SUM_TEN_COLS * this._cellSize + GRID_GAP * (SUM_TEN_COLS - 1);
        this._gridH = SUM_TEN_ROWS * this._cellSize + GRID_GAP * (SUM_TEN_ROWS - 1);
        this._gridLeft = -this._gridW * 0.5;
        this._gridTop = this._gridH * 0.5;

        const board = new Node('GridBoard');
        board.parent = gameArea;
        board.layer = layer;
        const boardUt = board.addComponent(UITransform);
        boardUt.setContentSize(this._gridW + GRID_FRAME * 2, this._gridH + GRID_FRAME * 2);
        boardUt.setAnchorPoint(0.5, 0.5);
        this._gridBoard = board;

        const frameG = board.addComponent(Graphics);
        frameG.fillColor = Color.BLACK;
        frameG.roundRect(
            -boardUt.width * 0.5,
            -boardUt.height * 0.5,
            boardUt.width,
            boardUt.height,
            6,
        );
        frameG.fill();

        const cellsRoot = new Node('Cells');
        cellsRoot.parent = board;
        cellsRoot.layer = layer;
        cellsRoot.setPosition(0, 0, 0);

        this._cellNodes = [];
        for (let r = 0; r < SUM_TEN_ROWS; r++) {
            this._cellNodes[r] = [];
            for (let c = 0; c < SUM_TEN_COLS; c++) {
                const cell = this._createCellNode(layer, r, c);
                cell.parent = cellsRoot;
                this._cellNodes[r][c] = cell;
            }
        }

        const selectNode = new Node('Selection');
        selectNode.parent = board;
        selectNode.layer = layer;
        selectNode.setSiblingIndex(cellsRoot.getSiblingIndex() + 1);
        this._selectionGfx = selectNode.addComponent(Graphics);

        board.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        board.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        board.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        board.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
    }

    private _createCellNode(layer: number, row: number, col: number): Node {
        const cell = new Node(`Cell_${row}_${col}`);
        cell.layer = layer;
        const ut = cell.addComponent(UITransform);
        ut.setContentSize(this._cellSize, this._cellSize);
        ut.setAnchorPoint(0.5, 0.5);
        const { x, y } = this._cellCenter(row, col);
        cell.setPosition(x, y, 0);

        const bg = new Node('Bg');
        bg.parent = cell;
        bg.layer = layer;
        const bgUt = bg.addComponent(UITransform);
        bgUt.setContentSize(this._cellSize, this._cellSize);
        bg.addComponent(Graphics);

        const lbNode = new Node('Digit');
        lbNode.parent = cell;
        lbNode.layer = layer;
        const lbUt = lbNode.addComponent(UITransform);
        lbUt.setContentSize(this._cellSize, this._cellSize);
        const lb = lbNode.addComponent(Label);
        lb.fontSize = Math.max(18, Math.floor(this._cellSize * 0.52));
        lb.lineHeight = lb.fontSize + 4;
        lb.horizontalAlign = Label.HorizontalAlign.CENTER;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(lb);

        return cell;
    }

    private _cellCenter(row: number, col: number): { x: number; y: number } {
        const x = this._gridLeft + col * (this._cellSize + GRID_GAP) + this._cellSize * 0.5;
        const y = this._gridTop - row * (this._cellSize + GRID_GAP) - this._cellSize * 0.5;
        return { x, y };
    }

    private _rectPixelBounds(rect: GridRect): { x: number; y: number; w: number; h: number } {
        const tl = this._cellCenter(rect.minRow, rect.minCol);
        const br = this._cellCenter(rect.maxRow, rect.maxCol);
        const half = this._cellSize * 0.5;
        const left = tl.x - half;
        const top = tl.y + half;
        const right = br.x + half;
        const bottom = br.y - half;
        return { x: left, y: bottom, w: right - left, h: top - bottom };
    }

    private _localToCell(local: Vec3, clamp = false): GridPoint | null {
        const relX = local.x - this._gridLeft;
        const relY = this._gridTop - local.y;
        if (!clamp && (relX < 0 || relY < 0)) {
            return null;
        }
        let col = Math.floor(Math.max(0, relX) / (this._cellSize + GRID_GAP));
        let row = Math.floor(Math.max(0, relY) / (this._cellSize + GRID_GAP));
        if (clamp) {
            col = Math.max(0, Math.min(SUM_TEN_COLS - 1, col));
            row = Math.max(0, Math.min(SUM_TEN_ROWS - 1, row));
            return { row, col };
        }
        if (row < 0 || row >= SUM_TEN_ROWS || col < 0 || col >= SUM_TEN_COLS) {
            return null;
        }
        const inCellX = relX - col * (this._cellSize + GRID_GAP);
        const inCellY = relY - row * (this._cellSize + GRID_GAP);
        if (inCellX > this._cellSize || inCellY > this._cellSize) {
            return null;
        }
        return { row, col };
    }

    private _touchLocal(e: EventTouch): Vec3 {
        const ui = this._gridBoard!.getComponent(UITransform)!;
        return ui.convertToNodeSpaceAR(new Vec3(e.getUILocation().x, e.getUILocation().y, 0));
    }

    private _onTouchStart(e: EventTouch): void {
        const cell = this._localToCell(this._touchLocal(e), true);
        if (!cell) {
            return;
        }
        this._dragStart = cell;
        this._dragEnd = cell;
        this._drawSelection();
        e.propagationStopped = true;
    }

    private _onTouchMove(e: EventTouch): void {
        if (!this._dragStart) {
            return;
        }
        const cell = this._localToCell(this._touchLocal(e), true);
        if (cell) {
            this._dragEnd = cell;
        }
        this._drawSelection();
        e.propagationStopped = true;
    }

    private _onTouchEnd(e: EventTouch): void {
        if (!this._dragStart || !this._dragEnd) {
            this._clearSelection();
            return;
        }
        const rect = this._core.normalizeRect(
            this._dragStart.row,
            this._dragStart.col,
            this._dragEnd.row,
            this._dragEnd.col,
        );
        const cleared = this._core.tryClearRect(rect);
        this._clearSelection();
        if (cleared) {
            this._syncGrid();
            if (this._core.isCleared()) {
                this._showWinToast();
            }
        }
        e.propagationStopped = true;
    }

    private _onTouchCancel(): void {
        this._clearSelection();
    }

    private _clearSelection(): void {
        this._dragStart = null;
        this._dragEnd = null;
        this._selectionGfx?.clear();
    }

    private _drawSelection(): void {
        const g = this._selectionGfx;
        if (!g || !this._dragStart || !this._dragEnd) {
            return;
        }
        const rect = this._core.normalizeRect(
            this._dragStart.row,
            this._dragStart.col,
            this._dragEnd.row,
            this._dragEnd.col,
        );
        const { x, y, w, h } = this._rectPixelBounds(rect);
        g.clear();
        g.fillColor = SELECT_FILL;
        g.rect(x, y, w, h);
        g.fill();
        g.lineWidth = 3;
        g.strokeColor = SELECT_STROKE;
        g.rect(x, y, w, h);
        g.stroke();
    }

    private _syncGrid(): void {
        const grid = this._core.grid;
        for (let r = 0; r < SUM_TEN_ROWS; r++) {
            for (let c = 0; c < SUM_TEN_COLS; c++) {
                const v = grid[r][c];
                const cell = this._cellNodes[r][c];
                const bgG = cell.getChildByName('Bg')?.getComponent(Graphics);
                const lb = cell.getChildByName('Digit')?.getComponent(Label);
                if (!bgG || !lb) {
                    continue;
                }
                bgG.clear();
                if (v <= 0) {
                    lb.string = '';
                    bgG.fillColor = new Color(220, 225, 230, 255);
                    bgG.rect(-this._cellSize * 0.5, -this._cellSize * 0.5, this._cellSize, this._cellSize);
                    bgG.fill();
                    continue;
                }
                const color = DIGIT_COLORS[v] ?? Color.BLACK;
                bgG.fillColor = Color.WHITE;
                bgG.rect(-this._cellSize * 0.5, -this._cellSize * 0.5, this._cellSize, this._cellSize);
                bgG.fill();
                bgG.lineWidth = 2;
                bgG.strokeColor = color;
                bgG.rect(-this._cellSize * 0.5 + 1, -this._cellSize * 0.5 + 1, this._cellSize - 2, this._cellSize - 2);
                bgG.stroke();
                lb.string = `${v}`;
                lb.color = color;
            }
        }
    }

    private _startLevel(): void {
        this._core.startLevel();
        this._updateLevelLabel();
        this._syncGrid();
    }

    private _updateLevelLabel(): void {
        if (this._levelLabel) {
            this._levelLabel.string = `关卡 ${this._core.level}`;
        }
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
                GAME_CHROME_SLOTS.refresh(() => this._onRestartClicked()),
                GAME_CHROME_SLOTS.share('sum_ten'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    private _onRestartClicked(): void {
        this._clearSelection();
        this._startLevel();
    }

    private _showWinToast(): void {
        const parent = this.node.getChildByName('SumTenRoot');
        if (!parent) {
            return;
        }

        const clearedLevel = this._core.level;
        GameWinToast.show(
            parent,
            () => {
                this._core.advanceLevel();
                this._updateLevelLabel();
                this._syncGrid();
            },
            () => this._exitToLobby(),
            {
                title: '过关！',
                subTitle: `第 ${clearedLevel} 关完成`,
                retryLabel: '下一关',
            },
        );
    }

    private _onLeaderboardClicked(): void {
        const parent = this.node.getChildByName('SumTenRoot');
        if (!parent) {
            return;
        }
        LeaderboardPopup.show(parent);
    }

    private _onHelpClicked(): void {
        const parent = this.node.getChildByName('SumTenRoot');
        if (!parent) {
            return;
        }
        const helpLines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '清空整盘数字即可进入下一关' },
            { text: '操作方法', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '在棋盘上拖拽框选一块矩形区域' },
            { text: '游戏规则', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '若框内所有数字之和等于 10，则消除这些数字' },
            { text: '若和不等于 10，则不会发生任何变化' },
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

    private _exitToLobby(): void {
        director.loadScene('Lobby');
    }
}
