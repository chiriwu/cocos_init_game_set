import {
    _decorator,
    Button,
    Color,
    Component,
    EventTouch,
    Graphics,
    Label,
    Node,
    UITransform,
    Widget,
    director,
} from 'cc';
import { SpotDiffCore, LevelConfig } from './SpotDiffCore';
import { loadIconFont } from '../../core/IconFont';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import {
    buildGameChromeActionBar,
    buildGameChromeAdStrip,
    refreshGameChromeIconLabels,
    GAME_CHROME_SLOTS,
} from '../../game/chrome/GameChromeBuilder';
import { getBottomActionBarCenterY } from '../../game/chrome/GameChromeLayout';
import { GameHelpDialog, HelpDialogLine, HelpDialogOptions } from '../../game/chrome/GameHelpDialog';
import { LeaderboardPopup } from '../../game/chrome/LeaderboardPopup';
import { GAME_CHROME_PALETTE } from '../../game/chrome/GameChromeConfig';
import { GameFailToast } from '../../game/chrome/GameFailToast';
import { GameWinToast } from '../../game/chrome/GameWinToast';

const { ccclass } = _decorator;

const PAPER = GAME_CHROME_PALETTE.BOARD_BG;
const TITLE_INK = new Color(35, 44, 48, 255);
const BODY = new Color(80, 90, 95, 255);
const PRIMARY = GAME_CHROME_PALETTE.PRIMARY;
const ON_PRIMARY = GAME_CHROME_PALETTE.ON_PRIMARY;
const ACCENT = new Color(239, 83, 80, 255);
const TILE_BG = new Color(255, 248, 238, 255);
const TILE_BORDER = new Color(100, 120, 140, 255);

const NAV_BAR_H = 56;
const GAME_AREA_PADDING = 20;
const GRID_CELL_SIZE = 52;

@ccclass('SpotDiffFramework')
export class SpotDiffFramework extends Component {
    private _core: SpotDiffCore | null = null;
    private _timerLabel: Label | null = null;
    private _timeRemaining: number = 0;
    private _timerInterval: number = 0;
    private _levelLabel: Label | null = null;
    private _targetCharLabel: Label | null = null;
    private _gridNode: Node | null = null;
    private _charNodes: Node[][] = [];
    private _selectedLevelId: string = 'level1';
    private _currentLevelIndex: number = 0;
    private _isAnimating: boolean = false;
    private _isGameEnded: boolean = false;
    private _gamePage: Node | null = null;

    onLoad(): void {
        this._core = new SpotDiffCore();
        this._buildGamePage();
    }

    onDestroy(): void {
        this._stopTimer();
    }

    private _buildGamePage(): void {
        const root = this.node;
        const parentTrans = root.parent?.getComponent(UITransform);
        const cw = parentTrans ? parentTrans.width : 720;
        const ch = parentTrans ? parentTrans.height : 1280;

        const wrap = this._buildWrap(root, cw, ch);
        this._gamePage = this._buildPageNode(wrap, 'GamePage', cw, ch);

        this._buildNavBar(this._gamePage, wrap.layer, cw);

        const contentTop = ch * 0.5 - NAV_BAR_H - 12;

        this._buildHeader(this._gamePage, wrap.layer, cw, contentTop);

        const gridTopY = contentTop - 100;
        this._buildGameGrid(this._gamePage, wrap.layer, cw, gridTopY);

        this._mountBottomChrome(this._gamePage, wrap.layer, cw, ch);

        this._startLevel();
    }

    private _buildWrap(root: Node, cw: number, ch: number): Node {
        const wrap = new Node('SpotDiffRoot');
        wrap.parent = root;
        wrap.layer = root.layer;
        const wUt = wrap.addComponent(UITransform);
        wUt.setContentSize(cw, ch);
        wUt.setAnchorPoint(0.5, 0.5);
        wrap.setPosition(0, 0, 0);
        const wW = wrap.addComponent(Widget);
        wW.isAlignTop = true;
        wW.isAlignBottom = true;
        wW.isAlignLeft = true;
        wW.isAlignRight = true;
        wW.top = 0;
        wW.bottom = 0;
        wW.left = 0;
        wW.right = 0;
        wW.alignMode = 2;

        const backdrop = new Node('Backdrop');
        backdrop.parent = wrap;
        backdrop.layer = wrap.layer;
        backdrop.setSiblingIndex(0);
        const bdUt = backdrop.addComponent(UITransform);
        bdUt.setContentSize(cw, ch);
        bdUt.setAnchorPoint(0.5, 0.5);
        const bdG = backdrop.addComponent(Graphics);
        bdG.fillColor = PAPER;
        bdG.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        bdG.fill();

        return wrap;
    }

    private _buildPageNode(parent: Node, name: string, cw: number, ch: number): Node {
        const page = new Node(name);
        page.parent = parent;
        page.layer = parent.layer;
        const pUt = page.addComponent(UITransform);
        pUt.setContentSize(cw, ch);
        pUt.setAnchorPoint(0.5, 0.5);
        return page;
    }

    private _buildNavBar(parent: Node, layer: number, cw: number): Node {
        const navBar = new Node('NavBar');
        navBar.parent = parent;
        navBar.layer = layer;
        const navUt = navBar.addComponent(UITransform);
        navUt.setContentSize(cw, NAV_BAR_H);
        navUt.setAnchorPoint(0.5, 1);
        const navW = navBar.addComponent(Widget);
        navW.isAlignTop = true;
        navW.isAlignLeft = true;
        navW.isAlignRight = true;
        navW.top = 0;
        navW.left = 0;
        navW.right = 0;
        navW.alignMode = 2;
        const navG = navBar.addComponent(Graphics);
        navG.fillColor = PAPER;
        navG.rect(-cw * 0.5, -NAV_BAR_H, cw, NAV_BAR_H);
        navG.fill();

        return navBar;
    }

    private _buildHeader(parent: Node, layer: number, cw: number, topY: number): void {
        this._levelLabel = this._addLabel(parent, 'LevelLabel', topY - 20, 140, 52, '第 1 关', 40, 48, TITLE_INK, Label.HorizontalAlign.CENTER, 0);

        const infoBar = new Node('InfoBar');
        infoBar.parent = parent;
        infoBar.layer = layer;
        infoBar.setPosition(0, topY - 96, 0);

        this._timerLabel = this._addLabel(infoBar, 'Timer', 0, cw * 0.5 - 20, 36, '倒计时: 29秒', 20, 24, BODY, Label.HorizontalAlign.LEFT, -cw * 0.5 + 80);

        this._targetCharLabel = this._addLabel(infoBar, 'TargetChar', 0, cw * 0.5 - 20, 36, '寻找: 圆', 20, 24, BODY, Label.HorizontalAlign.RIGHT, cw * 0.5 - 60);
    }

    private _buildGameGrid(parent: Node, layer: number, cw: number, topY: number): void {
        const gridSize = 12;
        const totalSize = gridSize * GRID_CELL_SIZE;
        const startX = -totalSize * 0.5;
        const startY = totalSize * 0.5;

        this._gridNode = new Node('GameGrid');
        this._gridNode.parent = parent;
        this._gridNode.layer = layer;
        const gUt = this._gridNode.addComponent(UITransform);
        gUt.setContentSize(totalSize, totalSize);
        gUt.setAnchorPoint(0.5, 0.5);
        this._gridNode.setPosition(0, topY - totalSize * 0.5 - 50, 0);

        const gG = this._gridNode.addComponent(Graphics);
        gG.fillColor = PAPER;
        gG.rect(-totalSize * 0.5, -totalSize * 0.5, totalSize, totalSize);
        gG.fill();
        gG.strokeColor = TILE_BORDER;
        gG.lineWidth = 2;
        gG.rect(-totalSize * 0.5, -totalSize * 0.5, totalSize, totalSize);
        gG.stroke();

        this._charNodes = [];
        for (let row = 0; row < gridSize; row++) {
            this._charNodes[row] = [];
            for (let col = 0; col < gridSize; col++) {
                const cellNode = new Node(`Cell_${row}_${col}`);
                cellNode.parent = this._gridNode;
                cellNode.layer = layer;
                const cUt = cellNode.addComponent(UITransform);
                cUt.setContentSize(GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                cUt.setAnchorPoint(0.5, 0.5);
                cellNode.setPosition(
                    startX + col * GRID_CELL_SIZE + GRID_CELL_SIZE * 0.5,
                    startY - row * GRID_CELL_SIZE - GRID_CELL_SIZE * 0.5,
                    0
                );

                const cG = cellNode.addComponent(Graphics);
                cG.fillColor = PAPER;
                cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                cG.fill();
                cG.strokeColor = TILE_BORDER;
                cG.lineWidth = 1;
                cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                cG.stroke();

                const lbNode = new Node(`Label_${row}_${col}`);
                lbNode.parent = cellNode;
                lbNode.layer = layer;
                const lbUt = lbNode.addComponent(UITransform);
                lbUt.setContentSize(GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                lbUt.setAnchorPoint(0.5, 0.5);
                const lb = lbNode.addComponent(Label);
                lb.fontSize = 22;
                lb.lineHeight = 26;
                lb.color = TITLE_INK;
                lb.horizontalAlign = Label.HorizontalAlign.CENTER;
                lb.verticalAlign = Label.VerticalAlign.CENTER;
                applyGlobalLabelFont(lb);

                cellNode.on(Node.EventType.TOUCH_END, () => {
                    this._onCellClick(row, col, cellNode);
                }, this);

                this._charNodes[row][col] = cellNode;
            }
        }
    }

    private _refreshGrid(level: LevelConfig): void {
        if (!this._gridNode || !this._core?.targetPosition) return;

        const mainChar = level.mainChar;
        const targetChar = level.targetChar;
        const targetRow = this._core.targetPosition.row;
        const targetCol = this._core.targetPosition.col;

        for (let row = 0; row < level.gridSize; row++) {
            for (let col = 0; col < level.gridSize; col++) {
                const cellNode = this._charNodes[row]?.[col];
                if (!cellNode) continue;

                const lbNode = cellNode.getChildByName(`Label_${row}_${col}`);
                const lb = lbNode?.getComponent(Label);
                if (lb) {
                    lb.string = row === targetRow && col === targetCol ? targetChar : mainChar;
                    lb.color = TITLE_INK;
                }

                const cG = cellNode.getComponent(Graphics);
                if (cG) {
                    cG.fillColor = PAPER;
                    cG.clear();
                    cG.fillColor = PAPER;
                    cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                    cG.fill();
                    cG.strokeColor = TILE_BORDER;
                    cG.lineWidth = 1;
                    cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                    cG.stroke();
                }
            }
        }
    }

    private _onCellClick(row: number, col: number, cellNode: Node): void {
        if (this._isAnimating || !this._core || this._isGameEnded) return;

        const isCorrect = this._core.checkPosition(row, col);

        if (isCorrect) {
            this._stopTimer();
            this._highlightCorrect(cellNode);
            setTimeout(() => {
                this._nextLevel();
            }, 500);
        } else {
            this._highlightWrong(cellNode);
        }
    }

    private _highlightCorrect(cellNode: Node): void {
        const cG = cellNode.getComponent(Graphics);
        if (cG) {
            cG.fillColor = new Color(76, 175, 80, 255);
            cG.clear();
            cG.fillColor = new Color(76, 175, 80, 255);
            cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
            cG.fill();
        }

        const lbNode = cellNode.children[0];
        const lb = lbNode?.getComponent(Label);
        if (lb) {
            lb.color = Color.WHITE;
        }
    }

    private _highlightWrong(cellNode: Node): void {
        const cG = cellNode.getComponent(Graphics);
        if (cG) {
            cG.fillColor = ACCENT;
            cG.clear();
            cG.fillColor = ACCENT;
            cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
            cG.fill();
        }

        const lbNode = cellNode.children[0];
        const lb = lbNode?.getComponent(Label);
        if (lb) {
            lb.color = Color.WHITE;
        }

        setTimeout(() => {
            const cG = cellNode.getComponent(Graphics);
            if (cG) {
                cG.fillColor = PAPER;
                cG.clear();
                cG.fillColor = PAPER;
                cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                cG.fill();
                cG.strokeColor = TILE_BORDER;
                cG.lineWidth = 1;
                cG.rect(-(GRID_CELL_SIZE - 2) * 0.5, -(GRID_CELL_SIZE - 2) * 0.5, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
                cG.stroke();
            }

            if (lb) {
                lb.color = TITLE_INK;
            }
        }, 150);
    }

    private _startLevel(): void {
        if (!this._core) return;

        const levelIndex = this._currentLevelIndex % this._core.totalLevels;
        
        this._core.startLevel(levelIndex);
        const level = this._core.currentLevel;

        if (!level) return;

        this._timeRemaining = level.timeLimit;

        if (this._levelLabel) {
            this._levelLabel.string = `第 ${levelIndex + 1} 关`;
        }

        if (this._targetCharLabel) {
            this._targetCharLabel.string = `寻找: ${level.targetChar}`;
        }

        this._refreshGrid(level);
        this._startTimer();
    }

    private _nextLevel(): void {
        const nextLevelIndex = this._currentLevelIndex + 1;
        if (this._core && nextLevelIndex >= this._core.totalLevels) {
            this._isGameEnded = true;
            this._showWinToast();
        } else {
            this._currentLevelIndex = nextLevelIndex;
            this._startLevel();
        }
    }

    private _startTimer(): void {
        this._stopTimer();

        if (this._timerLabel && this._core?.currentLevel) {
            this._timerLabel.string = `倒计时: ${this._timeRemaining}秒`;
        }

        this._timerInterval = setInterval(() => {
            this._timeRemaining--;

            if (this._timerLabel) {
                this._timerLabel.string = `倒计时: ${this._timeRemaining}秒`;
            }

            if (this._timeRemaining <= 0) {
                this._stopTimer();
                this._isGameEnded = true;
                this._showFailToast();
            }
        }, 1000);
    }

    private _stopTimer(): void {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = 0;
        }
    }

    private _showWinToast(): void {
        const parent = this.node.getChildByName('SpotDiffRoot');
        if (!parent) {
            return;
        }

        GameWinToast.show(
            parent,
            () => {
                this._currentLevelIndex = 0;
                this._isGameEnded = false;
                this._startLevel();
            },
            () => director.loadScene('Lobby'),
            {
                subTitle: '所有关卡已完成',
            },
        );
    }

    private _showFailToast(): void {
        const parent = this.node.getChildByName('SpotDiffRoot')?.getChildByName('GamePage');
        if (!parent) return;

        const level = this._core?.currentLevel;
        const levelNo = this._currentLevelIndex + 1;
        const hint = level ? `第 ${levelNo} 关 · 找: ${level.targetChar}` : `第 ${levelNo} 关`;

        const onRetry = () => {
            this._currentLevelIndex = 0;
            this._isGameEnded = false;
            this._startLevel();
        };

        const onHome = () => {
            director.loadScene('Lobby');
        };

        GameFailToast.show(parent, onRetry, onHome, { hint });
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

    private _mountBottomChrome(parent: Node, layer: number, cw: number, ch: number): void {
        buildGameChromeAdStrip(parent, layer, { cw, label: '广告位' });
        const bottomBtnY = getBottomActionBarCenterY(ch);
        const refs = buildGameChromeActionBar(parent, layer, {
            cw,
            centerY: bottomBtnY,
            slots: [
                GAME_CHROME_SLOTS.home(),
                GAME_CHROME_SLOTS.leaderboard(() => this._onLeaderboardClicked()),
                GAME_CHROME_SLOTS.help(() => this._onHelpClicked()),
                GAME_CHROME_SLOTS.share('spot_diff'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    private _onLeaderboardClicked(): void {
        const parent = this.node.getChildByName('SpotDiffRoot');
        if (!parent) {
            return;
        }
        LeaderboardPopup.show(parent);
    }

    private _onHelpClicked(): void {
        const parent = this._gamePage;
        if (!parent) return;

        const lines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '在密密麻麻的文字中，找出那个与众不同的字' },
            { text: '操作方法', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '仔细观察网格中的每个字，找到与其他字不同的那个' },
            { text: '点击你认为不同的字，如果正确则进入下一关' },
            { text: '游戏技巧', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '注意观察字的笔画、结构和形状' },
            { text: '时间有限，要快速找到目标字才能通关' },
        ];

        this.showHelpDialog(parent, '找不同游戏说明', lines);
    }

    private showHelpDialog(
        parent: Node,
        title: string,
        lines: HelpDialogLine[],
        options?: HelpDialogOptions
    ): void {
        GameHelpDialog.show(parent, title, lines, options);
    }
}
