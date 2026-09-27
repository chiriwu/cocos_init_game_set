import {
    _decorator,
    Button,
    Color,
    Component,
    director,
    Graphics,
    Label,
    Node,
    tween,
    UITransform,
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
import { GAME_CHROME_ACTION_ROW_DEFAULT_H, getAdStripHeight, getBottomActionBarCenterY } from '../../game/chrome/GameChromeLayout';
import { GameHelpDialog, HelpDialogLine, HelpDialogOptions } from '../../game/chrome/GameHelpDialog';
import { LeaderboardPopup } from '../../game/chrome/LeaderboardPopup';
import { ChessClearCore } from './ChessClearCore';

const { ccclass } = _decorator;


const NAV_BAR_H = 56;
const SIMPLE_HEADER_H = 132;

const CHESS_BOARD_COLS = ChessClearCore.COLS;
const CHESS_BOARD_ROWS = ChessClearCore.ROWS;
const CROSS_HIT_SIZE = 48;
const PAPER = GAME_CHROME_PALETTE.BOARD_BG;

@ccclass('ChessClearFramework')
export class ChessClearFramework extends Component {
    private _core: ChessClearCore | null = null;
    private _level = 0;
    private _gridSpacing = 72;
    private _levelLabel: Label | null = null;
    private _stepLabel: Label | null = null;
    private _previewTray: Node | null = null;
    private _boardNode: Node | null = null;
    private _crossNodes: Node[][] = [];
    private _layer = 0;

    onDestroy(): void {
        if (this._core) {
            this._core.reset();
        }
    }

    onLoad(): void {
        loadIconFont(() => {
            const slot = this.node;
            const slotUt = slot.getComponent(UITransform);
            const cw = slotUt?.width ?? 750;
            const ch = slotUt?.height ?? 1334;
            this._layer = slot.layer;

            this._buildRoot(slot, this._layer, cw, ch);
        });
    }

    private _buildRoot(slot: Node, layer: number, cw: number, ch: number): void {
        const root = new Node('ChessClearRoot');
        root.parent = slot;
        root.layer = layer;
        const rootUt = root.addComponent(UITransform);
        rootUt.setContentSize(cw, ch);
        rootUt.setAnchorPoint(0.5, 0.5);
        root.setPosition(0, 0, 0);

        this._buildNavBar(root, layer, cw);
        this._buildGamePage(root, layer, cw, ch);
        this._mountBottomChrome(root, layer, cw, ch);
        this._startGame();
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
                GAME_CHROME_SLOTS.share('chess_clear'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    private _onLeaderboardClicked(): void {
        const parent = this.node.getChildByName('ChessClearRoot');
        if (!parent) return;
        LeaderboardPopup.show(parent);
    }

    private _onHelpClicked(): void {
        const parent = this.node.getChildByName('ChessClearRoot');
        if (!parent) return;
        const helpLines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '用红車吃掉所有敌方棋子' },
            { text: '操作方法', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '点击交叉点移动棋子' },
            { text: '游戏规则', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '红車横竖直走，吃掉敌棋子后进入下一关' },
        ];
        this._showHelpDialog(parent, '游戏帮助', helpLines);
    }

    private _showHelpDialog(
        parent: Node,
        title: string,
        lines: HelpDialogLine[],
        options?: HelpDialogOptions
    ): void {
        GameHelpDialog.show(parent, title, lines, options);
    }

    private _exitToLobby(): void {
        director.loadScene('Lobby');
    }

    private _buildNavBar(parent: Node, layer: number, cw: number): Node {
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
        nbG.fillColor = PAPER;
        nbG.rect(-cw * 0.5, -NAV_BAR_H * 0.5, cw, NAV_BAR_H);
        nbG.fill();

        const backBtn = new Node('BackBtn');
        backBtn.parent = nb;
        backBtn.layer = layer;
        const bbUt = backBtn.addComponent(UITransform);
        bbUt.setContentSize(56, 56);
        bbUt.setAnchorPoint(0.5, 0.5);
        backBtn.setPosition(-cw * 0.5 + 28, 0, 0);
        const bbG = backBtn.addComponent(Graphics);
        bbG.strokeColor = new Color(247, 245, 240, 255);
        bbG.lineWidth = 3;
        bbG.moveTo(8, -12);
        bbG.lineTo(-8, 0);
        bbG.lineTo(8, 12);
        bbG.stroke();

        const titleNode = new Node('Title');
        titleNode.parent = nb;
        titleNode.layer = layer;
        const titleUt = titleNode.addComponent(UITransform);
        titleUt.setContentSize(200, NAV_BAR_H);
        titleUt.setAnchorPoint(0.5, 0.5);
        const titleLb = titleNode.addComponent(Label);
        titleLb.string = '象棋消除';
        titleLb.color = new Color(247, 245, 240, 255);
        titleLb.fontSize = 20;
        titleLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        applyGlobalLabelFont(titleLb);

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

        const gameArea = new Node('GameArea');
        gameArea.parent = page;
        gameArea.layer = layer;
        const gaUt = gameArea.addComponent(UITransform);
        const gameAreaH = ch - NAV_BAR_H - GAME_CHROME_ACTION_ROW_DEFAULT_H - getAdStripHeight();
        gaUt.setContentSize(cw, gameAreaH);
        gaUt.setAnchorPoint(0.5, 0.5);
        gameArea.setPosition(0, 0, 0);

        this._buildSimpleHeader(gameArea, layer, cw);
        this._buildBoard(gameArea, layer, cw);

        return page;
    }

    private _gridInnerWidth(): number {
        return this._gridSpacing * (CHESS_BOARD_COLS - 1);
    }

    private _gridInnerHeight(): number {
        return this._gridSpacing * (CHESS_BOARD_ROWS - 1);
    }

    /** 交叉点 (col, row) 在棋盘局部坐标 */
    private _crossLocalPos(col: number, row: number): { x: number; y: number } {
        const halfW = this._gridInnerWidth() * 0.5;
        const halfH = this._gridInnerHeight() * 0.5;
        return {
            x: -halfW + col * this._gridSpacing,
            y: halfH - row * this._gridSpacing,
        };
    }

    private _buildSimpleHeader(parent: Node, layer: number, cw: number): void {
        const gaH = parent.getComponent(UITransform)!.height;
        const header = new Node('SimpleHeader');
        header.parent = parent;
        header.layer = layer;
        const hUt = header.addComponent(UITransform);
        hUt.setContentSize(cw, SIMPLE_HEADER_H);
        hUt.setAnchorPoint(0.5, 1);
        header.setPosition(0, gaH * 0.5 - 8, 0);

        const levelNode = new Node('LevelNum');
        levelNode.parent = header;
        levelNode.layer = layer;
        const lnUt = levelNode.addComponent(UITransform);
        lnUt.setContentSize(88, 88);
        lnUt.setAnchorPoint(0.5, 0.5);
        levelNode.setPosition(-cw * 0.5 + 56, -36, 0);
        const levelLb = levelNode.addComponent(Label);
        levelLb.string = `${this._level}`;
        levelLb.fontSize = 56;
        levelLb.lineHeight = 64;
        levelLb.color = new Color(35, 44, 48, 255);
        levelLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        levelLb.verticalAlign = Label.VerticalAlign.CENTER;
        levelLb.enableOutline = true;
        levelLb.outlineColor = new Color(20, 20, 20, 255);
        levelLb.outlineWidth = 3;
        applyGlobalLabelFont(levelLb);
        this._levelLabel = levelLb;

        const centerCol = new Node('CenterCol');
        centerCol.parent = header;
        centerCol.layer = layer;
        const ccUt = centerCol.addComponent(UITransform);
        ccUt.setContentSize(200, SIMPLE_HEADER_H);
        ccUt.setAnchorPoint(0.5, 1);
        centerCol.setPosition(0, 0, 0);

        const trayW = 168;
        const trayH = 52;
        const tray = new Node('PreviewTray');
        tray.parent = centerCol;
        tray.layer = layer;
        this._previewTray = tray;
        const trayUt = tray.addComponent(UITransform);
        trayUt.setContentSize(trayW, trayH);
        trayUt.setAnchorPoint(0.5, 0.5);
        tray.setPosition(0, -32, 0);

        const stepBadge = new Node('StepBadge');
        stepBadge.parent = centerCol;
        stepBadge.layer = layer;
        const sbUt = stepBadge.addComponent(UITransform);
        sbUt.setContentSize(88, 28);
        sbUt.setAnchorPoint(0.5, 0.5);
        stepBadge.setPosition(0, -72, 0);

        const badgeBg = new Node('StepBadgeBg');
        badgeBg.parent = stepBadge;
        badgeBg.layer = layer;
        const bbUt = badgeBg.addComponent(UITransform);
        bbUt.setContentSize(88, 28);
        bbUt.setAnchorPoint(0.5, 0.5);
        const bbG = badgeBg.addComponent(Graphics);
        bbG.fillColor = new Color(120, 200, 255, 255);
        bbG.roundRect(-44, -14, 88, 28, 14);
        bbG.fill();

        const stepLbNode = new Node('StepLabel');
        stepLbNode.parent = stepBadge;
        stepLbNode.layer = layer;
        const slUt = stepLbNode.addComponent(UITransform);
        slUt.setContentSize(88, 28);
        slUt.setAnchorPoint(0.5, 0.5);
        const stepLb = stepLbNode.addComponent(Label);
        stepLb.string = '步数 0';
        stepLb.fontSize = 16;
        stepLb.lineHeight = 22;
        stepLb.color = new Color(30, 80, 140, 255);
        stepLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        stepLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(stepLb);
        this._stepLabel = stepLb;
    }

    private _refreshPreviewTray(layer: number, pieces: string[]): void {
        if (!this._previewTray) return;
        this._previewTray.removeAllChildren();
        const trayW = 168;
        const trayH = 52;

        const trayBg = new Node('TrayBg');
        trayBg.parent = this._previewTray;
        trayBg.layer = layer;
        const tbUt = trayBg.addComponent(UITransform);
        tbUt.setContentSize(trayW, trayH);
        tbUt.setAnchorPoint(0.5, 0.5);
        const tbG = trayBg.addComponent(Graphics);
        tbG.fillColor = new Color(92, 58, 28, 255);
        tbG.strokeColor = new Color(60, 36, 16, 255);
        tbG.lineWidth = 3;
        tbG.roundRect(-trayW * 0.5, -trayH * 0.5, trayW, trayH, 6);
        tbG.fill();
        tbG.stroke();

        if (pieces.length === 0) return;
        const pieceSpacing = 52;
        const startX = -((pieces.length - 1) * pieceSpacing) * 0.5;
        for (let i = 0; i < pieces.length; i++) {
            const pieceNode = this._createChessPieceVisual(pieces[i], layer, false);
            pieceNode.parent = this._previewTray;
            pieceNode.setPosition(startX + i * pieceSpacing, 0, 0);
        }
    }

    private _buildBoard(parent: Node, layer: number, cw: number): void {
        const innerW = this._gridInnerWidth();
        const innerH = this._gridInnerHeight();
        const boardSize = Math.max(innerW, innerH) + 24;

        const board = new Node('Board');
        board.parent = parent;
        board.layer = layer;
        this._boardNode = board;
        const boardUt = board.addComponent(UITransform);
        boardUt.setContentSize(boardSize, boardSize);
        boardUt.setAnchorPoint(0.5, 0.5);
        const gaH = parent.getComponent(UITransform)!.height;
        board.setPosition(0, gaH * 0.5 - SIMPLE_HEADER_H - boardSize * 0.5 - 16, 0);

        const boardBg = new Node('BoardBg');
        boardBg.parent = board;
        boardBg.layer = layer;
        const bbUt = boardBg.addComponent(UITransform);
        bbUt.setContentSize(boardSize, boardSize);
        bbUt.setAnchorPoint(0.5, 0.5);
        const bbG = boardBg.addComponent(Graphics);
        bbG.fillColor = new Color(160, 120, 70, 255);
        bbG.strokeColor = new Color(100, 60, 30, 255);
        bbG.lineWidth = 2;
        bbG.roundRect(-boardSize * 0.5, -boardSize * 0.5, boardSize, boardSize, 10);
        bbG.fill();
        bbG.stroke();

        const innerBg = new Node('InnerBg');
        innerBg.parent = board;
        innerBg.layer = layer;
        const ibUt = innerBg.addComponent(UITransform);
        ibUt.setContentSize(innerW, innerH);
        ibUt.setAnchorPoint(0.5, 0.5);
        const ibG = innerBg.addComponent(Graphics);
        ibG.fillColor = new Color(228, 195, 140, 255);
        ibG.rect(-innerW * 0.5, -innerH * 0.5, innerW, innerH);
        ibG.fill();

        this._drawGrid(innerBg, layer, innerW, innerH);
        this._buildCrossPoints(board, layer);
    }

    private _drawGrid(parent: Node, layer: number, innerW: number, innerH: number): void {
        const halfW = innerW * 0.5;
        const halfH = innerH * 0.5;

        const grid = new Node('GridLines');
        grid.parent = parent;
        grid.layer = layer;
        const gridUt = grid.addComponent(UITransform);
        gridUt.setContentSize(innerW, innerH);
        gridUt.setAnchorPoint(0.5, 0.5);

        const g = grid.addComponent(Graphics);
        g.strokeColor = new Color(70, 42, 18, 255);
        g.lineWidth = 2;

        for (let col = 0; col < CHESS_BOARD_COLS; col++) {
            const x = -halfW + col * this._gridSpacing;
            g.moveTo(x, -halfH);
            g.lineTo(x, halfH);
        }
        for (let row = 0; row < CHESS_BOARD_ROWS; row++) {
            const y = halfH - row * this._gridSpacing;
            g.moveTo(-halfW, y);
            g.lineTo(halfW, y);
        }
        g.stroke();
    }

    /** 每个交叉点可点击，棋子作为交叉点子节点叠在交叉线上 */
    private _buildCrossPoints(board: Node, layer: number): void {
        const crossesRoot = new Node('Crosses');
        crossesRoot.parent = board;
        crossesRoot.layer = layer;
        const crUt = crossesRoot.addComponent(UITransform);
        crUt.setContentSize(this._gridInnerWidth(), this._gridInnerHeight());
        crUt.setAnchorPoint(0.5, 0.5);

        this._crossNodes = [];
        for (let row = 0; row < CHESS_BOARD_ROWS; row++) {
            this._crossNodes[row] = [];
            for (let col = 0; col < CHESS_BOARD_COLS; col++) {
                const pos = this._crossLocalPos(col, row);
                const cross = new Node(`Cross_${col}_${row}`);
                cross.parent = crossesRoot;
                cross.layer = layer;
                const cUt = cross.addComponent(UITransform);
                cUt.setContentSize(CROSS_HIT_SIZE, CROSS_HIT_SIZE);
                cUt.setAnchorPoint(0.5, 0.5);
                cross.setPosition(pos.x, pos.y, 0);

                const hit = cross.addComponent(Button);
                hit.transition = Button.Transition.NONE;
                cross.on(Button.EventType.CLICK, () => {
                    this._onCrossClick(col, row);
                }, this);

                this._crossNodes[row][col] = cross;
            }
        }
    }

    private _onCrossClick(col: number, row: number): void {
        if (!this._core?.isPlaying) return;
        if (!this._core.canMoveRookTo(col, row)) return;

        this._core.moveRookTo(col, row);

        if (this._core.isRookCaptured) {
            this._playCaptureAnimation();
            return;
        }

        this._syncBoardFromCore();
        this._updateHeaderUI();

        if (this._core.isLevelCleared()) {
            this._level++;
            this._updateHeaderUI();
        }
    }

    private _playCaptureAnimation(): void {
        const core = this._core;
        const captor = core?.captureByEnemy;
        if (!core || !captor) {
            this._syncBoardFromCore();
            this._showFailToast();
            return;
        }

        const fromCross = this._crossNodes[captor.row]?.[captor.col];
        const toCross = this._crossNodes[core.rookRow]?.[core.rookCol];
        if (!fromCross || !toCross) {
            this._syncBoardFromCore();
            this._showFailToast();
            return;
        }

        let pieceNode = fromCross.getChildByName('Piece');
        if (!pieceNode) {
            pieceNode = this._createChessPieceVisual(captor.type, this._layer, false);
            pieceNode.name = 'Piece';
            pieceNode.parent = fromCross;
            pieceNode.setPosition(0, 0, 0);
        }

        const crossesRoot = fromCross.parent;
        if (!crossesRoot) {
            this._syncBoardFromCore();
            this._showFailToast();
            return;
        }

        const fromPos = fromCross.position.clone();
        const toPos = toCross.position.clone();
        pieceNode.parent = crossesRoot;
        pieceNode.setPosition(fromPos);

        tween(pieceNode)
            .to(0.35, { position: toPos })
            .call(() => {
                pieceNode.destroy();
                this._syncBoardFromCore();
                this._updateHeaderUI();
                this._showFailToast();
            })
            .start();
    }

    private _syncBoardFromCore(): void {
        if (!this._core) return;

        for (let row = 0; row < CHESS_BOARD_ROWS; row++) {
            for (let col = 0; col < CHESS_BOARD_COLS; col++) {
                const cross = this._crossNodes[row]?.[col];
                if (!cross) continue;

                const oldPiece = cross.getChildByName('Piece');
                if (oldPiece) oldPiece.destroy();

                if (this._core.isRookAt(col, row)) {
                    const rook = this._createChessPieceVisual(ChessClearCore.ROOK_TYPE, this._layer, true);
                    rook.name = 'Piece';
                    rook.parent = cross;
                    rook.setPosition(0, 0, 0);
                    continue;
                }

                const enemy = this._core.getEnemyAt(col, row);
                if (enemy) {
                    const piece = this._createChessPieceVisual(enemy.type, this._layer, false);
                    piece.name = 'Piece';
                    piece.parent = cross;
                    piece.setPosition(0, 0, 0);
                }
            }
        }
    }

    private _createChessPieceVisual(type: string, layer: number, isRook: boolean): Node {
        const piece = new Node(`PieceVisual_${type}`);
        piece.layer = layer;
        const pUt = piece.addComponent(UITransform);
        pUt.setContentSize(48, 48);
        pUt.setAnchorPoint(0.5, 0.5);

        const bg = new Node('PieceBg');
        bg.parent = piece;
        bg.layer = layer;
        const bgUt = bg.addComponent(UITransform);
        bgUt.setContentSize(48, 48);
        bgUt.setAnchorPoint(0.5, 0.5);
        const bgG = bg.addComponent(Graphics);

        if (isRook) {
            bgG.fillColor = new Color(239, 83, 80, 255);
            bgG.strokeColor = new Color(180, 40, 40, 255);
        } else {
            bgG.fillColor = new Color(255, 248, 230, 255);
            bgG.strokeColor = new Color(150, 120, 80, 255);
        }

        bgG.lineWidth = 2;
        bgG.circle(0, 0, 22);
        bgG.fill();
        bgG.stroke();

        const labelNode = new Node('PieceLabel');
        labelNode.parent = piece;
        labelNode.layer = layer;
        const lnUt = labelNode.addComponent(UITransform);
        lnUt.setContentSize(30, 30);
        lnUt.setAnchorPoint(0.5, 0.5);
        const lb = labelNode.addComponent(Label);
        lb.string = type;
        lb.fontSize = 24;
        lb.color = isRook ? new Color(255, 255, 255, 255) : new Color(60, 40, 20, 255);
        lb.horizontalAlign = Label.HorizontalAlign.CENTER;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(lb);

        return piece;
    }

    private _updateHeaderUI(): void {
        if (this._levelLabel) {
            this._levelLabel.string = `${this._level}`;
        }
        if (this._stepLabel && this._core) {
            this._stepLabel.string = `步数 ${this._core.remainingSteps}`;
        }
        if (this._core) {
            this._refreshPreviewTray(this._layer, [...this._core.nextBatch]);
        }
    }

    private _showFailToast(): void {
        const parent = this.node.getChildByName('ChessClearRoot')?.getChildByName('GamePage');
        if (!parent) return;
        if (parent.getChildByName('FailToast')) return;

        const toastW = 300;
        const toastH = 200;

        const toast = new Node('FailToast');
        toast.parent = parent;
        toast.layer = parent.layer;
        const tUt = toast.addComponent(UITransform);
        tUt.setContentSize(toastW, toastH);
        tUt.setAnchorPoint(0.5, 0.5);
        toast.setPosition(0, 0, 0);

        const toastBg = new Node('LoseToastBg');
        toastBg.parent = toast;
        toastBg.layer = toast.layer;
        const toastBgUt = toastBg.addComponent(UITransform);
        toastBgUt.setContentSize(toastW, toastH);
        toastBgUt.setAnchorPoint(0.5, 0.5);
        const tG = toastBg.addComponent(Graphics);
        tG.fillColor = new Color(180, 80, 80, 230);
        tG.roundRect(-toastW * 0.5, -toastH * 0.5, toastW, toastH, 16);
        tG.fill();

        const tLbNode = new Node('LoseToastLabel');
        tLbNode.parent = toast;
        tLbNode.layer = toast.layer;
        tLbNode.setPosition(0, 44, 0);
        const tLbUt = tLbNode.addComponent(UITransform);
        tLbUt.setContentSize(toastW - 24, 100);
        tLbUt.setAnchorPoint(0.5, 0.5);
        const tLb = tLbNode.addComponent(Label);
        tLb.string = '挑战失败\n车被吃掉了！';
        tLb.fontSize = 20;
        tLb.lineHeight = 26;
        tLb.color = Color.WHITE;
        tLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        tLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(tLb);

        const retryBtn = new Node('RetryBtn');
        retryBtn.parent = toast;
        retryBtn.layer = toast.layer;
        const rbUt = retryBtn.addComponent(UITransform);
        rbUt.setContentSize(120, 40);
        rbUt.setAnchorPoint(0.5, 0.5);
        retryBtn.setPosition(-50, -50, 0);

        const rbBg = new Node('RetryBg');
        rbBg.parent = retryBtn;
        rbBg.layer = retryBtn.layer;
        const rbBgUt = rbBg.addComponent(UITransform);
        rbBgUt.setContentSize(120, 40);
        rbBgUt.setAnchorPoint(0.5, 0.5);
        const rbG = rbBg.addComponent(Graphics);
        rbG.fillColor = Color.WHITE;
        rbG.roundRect(-60, -20, 120, 40, 8);
        rbG.fill();

        const rbLbNode = new Node('RetryLabel');
        rbLbNode.parent = retryBtn;
        rbLbNode.layer = retryBtn.layer;
        const rbLbUt = rbLbNode.addComponent(UITransform);
        rbLbUt.setContentSize(120, 40);
        rbLbUt.setAnchorPoint(0.5, 0.5);
        const rbLb = rbLbNode.addComponent(Label);
        rbLb.string = '再试一次';
        rbLb.fontSize = 18;
        rbLb.lineHeight = 22;
        rbLb.color = new Color(64, 158, 255, 255);
        rbLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        rbLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(rbLb);

        const rbBtn = retryBtn.addComponent(Button);
        rbBtn.transition = Button.Transition.NONE;
        retryBtn.on(Button.EventType.CLICK, () => {
            toast.destroy();
            this._level = 0;
            this._core?.reset();
            this._startGame();
        }, this);

        const homeBtn = new Node('HomeBtn');
        homeBtn.parent = toast;
        homeBtn.layer = toast.layer;
        const hUt = homeBtn.addComponent(UITransform);
        hUt.setContentSize(120, 40);
        hUt.setAnchorPoint(0.5, 0.5);
        homeBtn.setPosition(50, -50, 0);

        const hBg = new Node('HomeBg');
        hBg.parent = homeBtn;
        hBg.layer = homeBtn.layer;
        const hBgUt = hBg.addComponent(UITransform);
        hBgUt.setContentSize(120, 40);
        hBgUt.setAnchorPoint(0.5, 0.5);
        const hG = hBg.addComponent(Graphics);
        hG.fillColor = new Color(255, 240, 200, 255);
        hG.roundRect(-60, -20, 120, 40, 8);
        hG.fill();

        const hLbNode = new Node('HomeLabel');
        hLbNode.parent = homeBtn;
        hLbNode.layer = homeBtn.layer;
        const hLbUt = hLbNode.addComponent(UITransform);
        hLbUt.setContentSize(120, 40);
        hLbUt.setAnchorPoint(0.5, 0.5);
        const hLb = hLbNode.addComponent(Label);
        hLb.string = '回到主页';
        hLb.fontSize = 18;
        hLb.lineHeight = 22;
        hLb.color = new Color(139, 90, 43, 255);
        hLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        hLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(hLb);

        const homeBtnComp = homeBtn.addComponent(Button);
        homeBtnComp.transition = Button.Transition.NONE;
        homeBtn.on(Button.EventType.CLICK, () => {
            director.loadScene('Lobby');
        }, this);
    }

    private _startGame(): void {
        const page = this.node.getChildByName('ChessClearRoot')?.getChildByName('GamePage');
        page?.getChildByName('FailToast')?.destroy();

        if (!this._core) {
            this._core = new ChessClearCore();
        }
        this._core.startGame();
        this._level = 0;
        this._syncBoardFromCore();
        this._updateHeaderUI();
    }
}
