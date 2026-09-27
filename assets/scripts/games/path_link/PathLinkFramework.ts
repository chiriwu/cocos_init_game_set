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
import { PathLinkCore, PathSlideResult } from './PathLinkCore';
import { PATH_LINK_LEVELS } from './PathLinkData';

const { ccclass } = _decorator;

const NAV_BAR_H = 56;
const RULE_BAR_H = 88;
const BOARD_PAD = 16;
const BOARD_RADIUS = 14;
const DOT_RADIUS = 10;
const NODE_RADIUS = 28;
const PATH_LINE_W = 5;

const GRAY_DOT = new Color(170, 175, 182, 255);
const STAR_FILL = new Color(255, 210, 60, 255);
const STAR_STROKE = new Color(210, 150, 30, 255);
const PATH_FILL = new Color(30, 30, 30, 255);
const PATH_TEXT = Color.WHITE;
const FAIL_FILL = new Color(220, 60, 60, 255);

interface GridPoint {
    row: number;
    col: number;
}

@ccclass('PathLinkFramework')
export class PathLinkFramework extends Component {
    private _core = new PathLinkCore();
    private _layer = 0;
    private _cellNodes: Node[][] = [];
    private _pathGfx: Graphics | null = null;
    private _cellSize = 0;
    private _gridW = 0;
    private _gridH = 0;
    private _gridLeft = 0;
    private _gridTop = 0;
    private _movesValueLabel: Label | null = null;
    private _starsRow: Node | null = null;
    private _boardNode: Node | null = null;
    private _isDragging = false;
    private _lastSlideKey = '';

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
        const root = new Node('PathLinkRoot');
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

        this._buildNavBar(root, layer, cw, ch);
        this._buildRuleBar(root, layer, cw, ch);
        this._buildGameArea(root, layer, cw, ch);
        this._mountBottomChrome(root, layer, cw, ch);
        this._core.startLevel(0);
        this._syncView();
    }

    private _buildNavBar(parent: Node, layer: number, cw: number, ch: number): void {
        const nb = new Node('NavBar');
        nb.parent = parent;
        nb.layer = layer;
        const nbUt = nb.addComponent(UITransform);
        nbUt.setContentSize(cw, NAV_BAR_H);
        nbUt.setAnchorPoint(0.5, 0.5);
        nb.setPosition(0, ch * 0.5 - NAV_BAR_H * 0.5, 0);

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

    private _buildRuleBar(parent: Node, layer: number, cw: number, ch: number): void {
        const bar = new Node('RuleBar');
        bar.parent = parent;
        bar.layer = layer;
        const barW = cw - 48;
        const barUt = bar.addComponent(UITransform);
        barUt.setContentSize(barW, RULE_BAR_H);
        barUt.setAnchorPoint(0.5, 0.5);
        bar.setPosition(0, ch * 0.5 - NAV_BAR_H - RULE_BAR_H * 0.5 - 8, 0);

        const barBg = new Node('RuleBarBg');
        barBg.parent = bar;
        barBg.layer = layer;
        const bgUt = barBg.addComponent(UITransform);
        bgUt.setContentSize(barW, RULE_BAR_H);
        bgUt.setAnchorPoint(0.5, 0.5);
        const bgG = barBg.addComponent(Graphics);
        bgG.fillColor = Color.WHITE;
        bgG.roundRect(-barW * 0.5, -RULE_BAR_H * 0.5, barW, RULE_BAR_H, 12);
        bgG.fill();
        bgG.lineWidth = 1;
        bgG.strokeColor = new Color(210, 215, 220, 255);
        bgG.roundRect(-barW * 0.5 + 0.5, -RULE_BAR_H * 0.5 + 0.5, barW - 1, RULE_BAR_H - 1, 12);
        bgG.stroke();

        const starsRow = new Node('StarsRow');
        starsRow.parent = bar;
        starsRow.layer = layer;
        starsRow.setPosition(-barW * 0.5 + 24, 0, 0);
        this._starsRow = starsRow;
        this._rebuildStarRules(starsRow, layer);

        const sepX = barW * 0.5 - 100;
        const sep = new Node('Sep');
        sep.parent = bar;
        sep.layer = layer;
        sep.setPosition(sepX, 0, 0);
        const sepG = sep.addComponent(Graphics);
        sepG.lineWidth = 1;
        sepG.strokeColor = new Color(200, 205, 210, 255);
        sepG.moveTo(0, -RULE_BAR_H * 0.35);
        sepG.lineTo(0, RULE_BAR_H * 0.35);
        sepG.stroke();

        const movesCol = new Node('MovesCol');
        movesCol.parent = bar;
        movesCol.layer = layer;
        movesCol.setPosition(sepX + 52, 0, 0);

        const movesNum = new Node('MovesNum');
        movesNum.parent = movesCol;
        movesNum.layer = layer;
        movesNum.addComponent(UITransform).setContentSize(80, 44);
        this._movesValueLabel = movesNum.addComponent(Label);
        this._movesValueLabel.string = `${this._core.totalSteps}`;
        this._movesValueLabel.fontSize = 36;
        this._movesValueLabel.lineHeight = 40;
        this._movesValueLabel.color = new Color(35, 44, 48, 255);
        this._movesValueLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._movesValueLabel.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(this._movesValueLabel);

        const movesCap = new Node('MovesCap');
        movesCap.parent = movesCol;
        movesCap.layer = layer;
        movesCap.setPosition(0, -28, 0);
        movesCap.addComponent(UITransform).setContentSize(80, 20);
        const mcLb = movesCap.addComponent(Label);
        mcLb.string = 'MOVES';
        mcLb.fontSize = 12;
        mcLb.lineHeight = 16;
        mcLb.color = new Color(150, 158, 165, 255);
        mcLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        mcLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(mcLb);
    }

    private _rebuildStarRules(parent: Node, layer: number): void {
        parent.removeAllChildren();
        const rules = this._core.starRules;
        const spacing = 56;
        rules.forEach((step, i) => {
            const item = new Node(`StarRule_${step}`);
            item.parent = parent;
            item.layer = layer;
            item.setPosition(i * spacing, 0, 0);
            item.addComponent(UITransform).setContentSize(48, 48);
            const g = item.addComponent(Graphics);
            this._drawStarShape(g, 0, 0, 20, STAR_FILL, STAR_STROKE);

            const lbNode = new Node('Num');
            lbNode.parent = item;
            lbNode.layer = layer;
            lbNode.addComponent(UITransform).setContentSize(48, 48);
            const lb = lbNode.addComponent(Label);
            lb.string = `${step}`;
            lb.fontSize = 16;
            lb.lineHeight = 20;
            lb.color = new Color(120, 80, 20, 255);
            lb.horizontalAlign = Label.HorizontalAlign.CENTER;
            lb.verticalAlign = Label.VerticalAlign.CENTER;
            applyGlobalLabelFont(lb);
        });
    }

    private _buildGameArea(parent: Node, layer: number, cw: number, ch: number): void {
        let gameArea = parent.getChildByName('GameArea');
        if (!gameArea) {
            gameArea = new Node('GameArea');
            gameArea.parent = parent;
            gameArea.layer = layer;
        } else {
            gameArea.removeAllChildren();
        }

        const gaUt = gameArea.getComponent(UITransform) ?? gameArea.addComponent(UITransform);
        const gaH = ch - NAV_BAR_H - RULE_BAR_H - GAME_CHROME_ACTION_ROW_DEFAULT_H - getAdStripHeight() - 56;
        gaUt.setContentSize(cw - 32, gaH);
        gaUt.setAnchorPoint(0.5, 0.5);
        gameArea.setPosition(0, -20, 0);

        const { rows, cols } = this._core.levelDef;
        const innerW = gaUt.width - BOARD_PAD * 2;
        const innerH = gaUt.height - BOARD_PAD * 2;
        this._cellSize = Math.floor(Math.min(innerW / cols, innerH / rows));
        this._gridW = cols * this._cellSize;
        this._gridH = rows * this._cellSize;
        this._gridLeft = -this._gridW * 0.5;
        this._gridTop = this._gridH * 0.5;

        const board = new Node('Board');
        board.parent = gameArea;
        board.layer = layer;
        const boardUt = board.addComponent(UITransform);
        boardUt.setContentSize(this._gridW + BOARD_PAD * 2, this._gridH + BOARD_PAD * 2);
        boardUt.setAnchorPoint(0.5, 0.5);
        this._boardNode = board;

        const boardBg = board.addComponent(Graphics);
        boardBg.fillColor = Color.WHITE;
        boardBg.roundRect(-boardUt.width * 0.5, -boardUt.height * 0.5, boardUt.width, boardUt.height, BOARD_RADIUS);
        boardBg.fill();
        boardBg.lineWidth = 1;
        boardBg.strokeColor = new Color(220, 225, 230, 255);
        boardBg.roundRect(
            -boardUt.width * 0.5 + 0.5,
            -boardUt.height * 0.5 + 0.5,
            boardUt.width - 1,
            boardUt.height - 1,
            BOARD_RADIUS,
        );
        boardBg.stroke();

        const pathNode = new Node('PathLines');
        pathNode.parent = board;
        pathNode.layer = layer;
        this._pathGfx = pathNode.addComponent(Graphics);

        const cellsRoot = new Node('Cells');
        cellsRoot.parent = board;
        cellsRoot.layer = layer;
        cellsRoot.setSiblingIndex(pathNode.getSiblingIndex() + 1);

        this._cellNodes = [];
        for (let r = 0; r < rows; r++) {
            this._cellNodes[r] = [];
            for (let c = 0; c < cols; c++) {
                const cell = this._createCellNode(layer, r, c);
                cell.parent = cellsRoot;
                this._cellNodes[r][c] = cell;
            }
        }

        board.on(Node.EventType.TOUCH_START, this._onBoardTouchStart, this);
        board.on(Node.EventType.TOUCH_MOVE, this._onBoardTouchMove, this);
        board.on(Node.EventType.TOUCH_END, this._onBoardTouchEnd, this);
        board.on(Node.EventType.TOUCH_CANCEL, this._onBoardTouchCancel, this);
    }

    private _createCellNode(layer: number, row: number, col: number): Node {
        const cell = new Node(`Cell_${row}_${col}`);
        cell.layer = layer;
        const ut = cell.addComponent(UITransform);
        ut.setContentSize(this._cellSize, this._cellSize);
        ut.setAnchorPoint(0.5, 0.5);
        const { x, y } = this._cellCenter(row, col);
        cell.setPosition(x, y, 0);

        const vis = new Node('Vis');
        vis.parent = cell;
        vis.layer = layer;
        vis.addComponent(UITransform).setContentSize(this._cellSize, this._cellSize);
        vis.addComponent(Graphics);

        const digit = new Node('Digit');
        digit.parent = cell;
        digit.layer = layer;
        digit.addComponent(UITransform).setContentSize(this._cellSize, this._cellSize);
        const digitLb = digit.addComponent(Label);
        digitLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        digitLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(digitLb);
        digit.active = false;

        return cell;
    }

    private _cellKey(row: number, col: number): string {
        return `${row},${col}`;
    }

    private _boardTouchLocal(e: EventTouch): Vec3 {
        const ui = this._boardNode!.getComponent(UITransform)!;
        return ui.convertToNodeSpaceAR(new Vec3(e.getUILocation().x, e.getUILocation().y, 0));
    }

    private _localToCell(local: Vec3): GridPoint | null {
        const relX = local.x - this._gridLeft;
        const relY = this._gridTop - local.y;
        if (relX < 0 || relY < 0) {
            return null;
        }
        let col = Math.floor(relX / this._cellSize);
        let row = Math.floor(relY / this._cellSize);
        const { rows, cols } = this._core.levelDef;
        row = Math.max(0, Math.min(rows - 1, row));
        col = Math.max(0, Math.min(cols - 1, col));
        return { row, col };
    }

    private _kingLineCells(from: GridPoint, to: GridPoint): GridPoint[] {
        const out: GridPoint[] = [];
        let r = from.row;
        let c = from.col;
        while (r !== to.row || c !== to.col) {
            const dr = to.row > r ? 1 : to.row < r ? -1 : 0;
            const dc = to.col > c ? 1 : to.col < c ? -1 : 0;
            r += dr;
            c += dc;
            out.push({ row: r, col: c });
        }
        return out;
    }

    /** 沿 8 方向（含对角）逐步滑入，避免快速斜滑时跳过中间格 */
    private _slideThroughTo(target: GridPoint): void {
        const path = this._core.path;
        if (path.length === 0) {
            const result = this._core.tryStart(target.row, target.col);
            this._handleSlideResult(result);
            return;
        }

        if (this._core.isInPath(target.row, target.col)) {
            const result = this._core.trySlideTo(target.row, target.col);
            this._handleSlideResult(result);
            return;
        }

        const last = path[path.length - 1];
        const line = this._kingLineCells(last, target);
        for (const step of line) {
            if (this._core.isFailed) {
                break;
            }
            const result = this._core.trySlideTo(step.row, step.col);
            if (result === 'ignored') {
                break;
            }
            this._handleSlideResult(result);
            if (result === 'failed' || result === 'win' || result === 'truncated') {
                break;
            }
        }
    }

    private _onBoardTouchStart(e: EventTouch): void {
        if (this._core.isFailed) {
            return;
        }
        const cell = this._localToCell(this._boardTouchLocal(e));
        if (!cell) {
            return;
        }
        this._isDragging = true;
        this._lastSlideKey = this._cellKey(cell.row, cell.col);
        this._slideThroughTo(cell);
        e.propagationStopped = true;
    }

    private _onBoardTouchMove(e: EventTouch): void {
        if (!this._isDragging || this._core.isFailed) {
            return;
        }
        const cell = this._localToCell(this._boardTouchLocal(e));
        if (!cell) {
            return;
        }
        const key = this._cellKey(cell.row, cell.col);
        if (key === this._lastSlideKey) {
            return;
        }
        this._lastSlideKey = key;
        this._slideThroughTo(cell);
        e.propagationStopped = true;
    }

    private _onBoardTouchEnd(e: EventTouch): void {
        this._isDragging = false;
        this._lastSlideKey = '';
        if (!this._core.isFailed && this._core.checkWinOnRelease()) {
            this._showWinToast();
        }
        e.propagationStopped = true;
    }

    private _onBoardTouchCancel(): void {
        this._isDragging = false;
        this._lastSlideKey = '';
    }

    private _handleSlideResult(result: PathSlideResult): void {
        if (result === 'ignored') {
            return;
        }
        this._syncView();
        if (result === 'win') {
            this._showWinToast();
        }
    }

    private _cellCenter(row: number, col: number): { x: number; y: number } {
        const x = this._gridLeft + (col + 0.5) * this._cellSize;
        const y = this._gridTop - (row + 0.5) * this._cellSize;
        return { x, y };
    }

    private _syncView(): void {
        const { rows, cols } = this._core.levelDef;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this._drawCell(r, c);
            }
        }
        this._drawPathLines();
    }

    private _drawCell(row: number, col: number): void {
        const cell = this._cellNodes[row]?.[col];
        const def = this._core.cellAt(row, col);
        if (!cell || !def) {
            return;
        }
        const g = cell.getChildByName('Vis')?.getComponent(Graphics);
        const digitNode = cell.getChildByName('Digit');
        const digitLb = digitNode?.getComponent(Label);
        if (!g) {
            return;
        }
        g.clear();
        if (digitNode) {
            digitNode.active = false;
        }

        const fail = this._core.failPos;
        if (fail && fail.row === row && fail.col === col) {
            g.fillColor = FAIL_FILL;
            g.circle(0, 0, NODE_RADIUS * 0.72);
            g.fill();
            return;
        }

        const step = this._core.pathStepAt(row, col);
        if (step > 0) {
            this._drawPathNode(g, NODE_RADIUS * 0.72);
            if (digitNode && digitLb) {
                digitNode.active = true;
                digitLb.string = `${step}`;
                digitLb.fontSize = Math.floor(NODE_RADIUS * 0.65);
                digitLb.lineHeight = digitLb.fontSize + 4;
                digitLb.color = PATH_TEXT;
                digitLb.horizontalAlign = Label.HorizontalAlign.CENTER;
                digitLb.verticalAlign = Label.VerticalAlign.CENTER;
                applyGlobalLabelFont(digitLb);
            }
            return;
        }

        switch (def.type) {
            case 'dot':
                g.fillColor = GRAY_DOT;
                g.circle(0, 0, DOT_RADIUS);
                g.fill();
                break;
            case 'star':
                this._drawStarShape(g, 0, 0, NODE_RADIUS * 0.55, STAR_FILL, STAR_STROKE);
                break;
            case 'step':
                g.fillColor = new Color(245, 246, 248, 255);
                g.circle(0, 0, NODE_RADIUS * 0.85);
                g.fill();
                g.lineWidth = 2;
                g.strokeColor = new Color(190, 195, 200, 255);
                g.circle(0, 0, NODE_RADIUS * 0.85);
                g.stroke();
                if (digitNode && digitLb) {
                    digitNode.active = true;
                    digitLb.string = `${def.requiredStep ?? ''}`;
                    digitLb.fontSize = Math.floor(NODE_RADIUS * 0.75);
                    digitLb.lineHeight = digitLb.fontSize + 4;
                    digitLb.color = new Color(35, 44, 48, 255);
                    digitLb.horizontalAlign = Label.HorizontalAlign.CENTER;
                    digitLb.verticalAlign = Label.VerticalAlign.CENTER;
                    applyGlobalLabelFont(digitLb);
                }
                break;
            case 'end':
                this._drawEndNode(g, NODE_RADIUS * 0.75);
                break;
            default:
                break;
        }
    }

    private _drawPathLines(): void {
        const g = this._pathGfx;
        if (!g) {
            return;
        }
        g.clear();
        const path = this._core.path;
        if (path.length < 2) {
            return;
        }
        const fail = this._core.failPos;
        g.lineWidth = PATH_LINE_W;
        g.strokeColor = PATH_FILL;
        g.lineCap = Graphics.LineCap.ROUND;
        g.lineJoin = Graphics.LineJoin.ROUND;
        for (let i = 0; i < path.length - 1; i++) {
            const a = this._cellCenter(path[i].row, path[i].col);
            const b = this._cellCenter(path[i + 1].row, path[i + 1].col);
            if (i === 0) {
                g.moveTo(a.x, a.y);
            }
            g.lineTo(b.x, b.y);
        }
        g.stroke();

        // 失败段：最后一截连线改为红色
        if (fail && path.length >= 2) {
            const last = path[path.length - 1];
            const prev = path[path.length - 2];
            if (last.row === fail.row && last.col === fail.col) {
                const a = this._cellCenter(prev.row, prev.col);
                const b = this._cellCenter(last.row, last.col);
                g.lineWidth = PATH_LINE_W;
                g.strokeColor = FAIL_FILL;
                g.moveTo(a.x, a.y);
                g.lineTo(b.x, b.y);
                g.stroke();
            }
        }
    }

    private _drawStarShape(g: Graphics, cx: number, cy: number, outerR: number, fill: Color, stroke: Color): void {
        const innerR = outerR * 0.45;
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < 10; i++) {
            const angle = (-Math.PI / 2) + (i * Math.PI) / 5;
            const r = i % 2 === 0 ? outerR : innerR;
            points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
        }
        g.fillColor = fill;
        g.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            g.lineTo(points[i].x, points[i].y);
        }
        g.close();
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = stroke;
        g.stroke();
    }

    private _drawEndNode(g: Graphics, radius: number): void {
        g.lineWidth = 5;
        g.strokeColor = new Color(25, 25, 25, 255);
        g.circle(0, 0, radius);
        g.stroke();
        g.fillColor = new Color(25, 25, 25, 255);
        g.circle(0, 0, radius * 0.22);
        g.fill();
    }

    private _drawPathNode(g: Graphics, radius: number): void {
        g.fillColor = PATH_FILL;
        g.circle(0, 0, radius);
        g.fill();
    }

    private _startLevel(): void {
        this._isDragging = false;
        this._lastSlideKey = '';
        this._core.startLevel(this._core.levelIndex);
        if (this._starsRow) {
            this._rebuildStarRules(this._starsRow, this._layer);
        }
        if (this._movesValueLabel) {
            this._movesValueLabel.string = `${this._core.totalSteps}`;
        }
        const root = this.node.getChildByName('PathLinkRoot');
        if (root) {
            const cw = root.getComponent(UITransform)!.width;
            const ch = root.getComponent(UITransform)!.height;
            this._buildGameArea(root, this._layer, cw, ch);
        }
        this._syncView();
    }

    private _showWinToast(): void {
        const parent = this.node.getChildByName('PathLinkRoot');
        if (!parent) {
            return;
        }

        const isLast = this._core.levelIndex + 1 >= PATH_LINK_LEVELS.length;
        GameWinToast.show(
            parent,
            () => {
                if (this._core.advanceLevel()) {
                    this._startLevel();
                    return;
                }
                this._core.startLevel(0);
                this._startLevel();
            },
            () => this._exitToLobby(),
            {
                title: isLast ? '恭喜通关！' : '过关！',
                subTitle: isLast ? '全部关卡已完成' : `第 ${this._core.levelIndex + 1} 关完成`,
                retryLabel: isLast ? '再玩一次' : '下一关',
            },
        );
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
                GAME_CHROME_SLOTS.share('path_link'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    private _onRestartClicked(): void {
        this._isDragging = false;
        this._lastSlideKey = '';
        this._core.startLevel(this._core.levelIndex);
        this._syncView();
    }

    private _onLeaderboardClicked(): void {
        const parent = this.node.getChildByName('PathLinkRoot');
        if (!parent) {
            return;
        }
        LeaderboardPopup.show(parent);
    }

    private _onHelpClicked(): void {
        const parent = this.node.getChildByName('PathLinkRoot');
        if (!parent) {
            return;
        }
        const helpLines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '按规则把栅格上的点依次连成一条路径，最后一步落在双圆环上' },
            { text: '操作方法', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '按住并滑动：可连到上下左右及四个对角的相邻格' },
            { text: '滑回已走过的格子可回退路径；抬手完成连线' },
            { text: '游戏规则', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '顶部星星数字为「必须在星星格上落脚」的步数（任意星星均可）' },
            { text: '带数字的大圆点必须在对应步数踩中' },
            { text: '双圆环必须是最后一步；总步数见右侧 MOVES' },
            { text: '滑到相邻格但不符合规则则失败，该格变红且本局锁定' },
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
