import {
    _decorator,
    Color,
    Component,
    EventTouch,
    Graphics,
    Label,
    Node,
    UITransform,
    Vec3,
} from 'cc';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import { GAME_CHROME_PALETTE } from '../../game/chrome/GameChromeConfig';
import { OneStrokeGameCore } from './OneStrokeGameCore';
import { levelManager } from './OneStrokeLevelManager';
import type { OneStrokeLevelJson } from './OneStrokeLevelTypes';

const { ccclass, property } = _decorator;

/** 底图边（未走）：用 PRIMARY（青灰）保证在白板卡片上可见 */
const EDGE_BASE = GAME_CHROME_PALETTE.PRIMARY;
const EDGE_WIDTH_BASE = 3.5;
/** 单向箭头与锁边提示 */
const EDGE_ARROW = new Color(
    GAME_CHROME_PALETTE.PRIMARY.r,
    GAME_CHROME_PALETTE.PRIMARY.g,
    GAME_CHROME_PALETTE.PRIMARY.b,
    230,
);
const EDGE_WIDTH_ARROW = 2;
/** 已走路径 / 橡皮筋 / 当前点脉冲（同色系） */
const ACCENT_GREEN = new Color(76, 175, 80, 255);
const RUBBER = new Color(ACCENT_GREEN.r, ACCENT_GREEN.g, ACCENT_GREEN.b, 190);
const DONE_LINE = new Color(ACCENT_GREEN.r, ACCENT_GREEN.g, ACCENT_GREEN.b, 255);
const PULSE_RING = new Color(ACCENT_GREEN.r, ACCENT_GREEN.g, ACCENT_GREEN.b, 235);
const EDGE_WIDTH_DONE = 5.5;
const EDGE_WIDTH_TRACE = 4.5;
/** 节点：纯色圆点 */
const VERT_FILL = GAME_CHROME_PALETTE.PRIMARY;
const VERT_STROKE = GAME_CHROME_PALETTE.ON_PRIMARY;

export interface OneStrokeBoardCallbacks {
    onStep?: (n: number) => void;
    onWin?: () => void;
}

@ccclass('OneStrokeBoardView')
export class OneStrokeBoardView extends Component {
    private _core: OneStrokeGameCore | null = null;
    private _callbacks: OneStrokeBoardCallbacks = {};
    private _scale = 1;
    private _cw = 540;
    private _ch = 750;
    private _vertexRadius = 18;
    private _hitRadiusDesign = 36;
    private _initialized = false;
    /** 异步换关时递增，忽略过期的 loadLevelData 回调 */
    private _loadGeneration = 0;

    private _gEdges!: Graphics;
    private _gDone!: Graphics;
    private _gTrace!: Graphics;
    private _pointsLayer!: Node;
    private _vertexNodes = new Map<string, Node>();
    private _startVertexId: string | null = null;
    /** 走过至少一条边后高亮「必经当前点」 */
    private _pulseNode: Node | null = null;
    private _pulseActive = false;
    private _pulsePhase = 0;

    private _moveCount = 0;
    private _fingerLocal = new Vec3();
    private _drawing = false;
    /** 已走完的线段（设计坐标系端点 id），用于描红 */
    private readonly _donePairs: Array<{ a: string; b: string }> = [];

    onLoad(): void {
        const ut = this.node.getComponent(UITransform)!;
        ut.setAnchorPoint(0.5, 0.5);

        const edges = new Node('Edges');
        edges.parent = this.node;
        edges.layer = this.node.layer;
        edges.addComponent(UITransform).setContentSize(ut.width, ut.height);
        this._gEdges = edges.addComponent(Graphics);

        const done = new Node('DoneLines');
        done.parent = this.node;
        done.layer = this.node.layer;
        done.addComponent(UITransform).setContentSize(ut.width, ut.height);
        this._gDone = done.addComponent(Graphics);

        const trace = new Node('Trace');
        trace.parent = this.node;
        trace.layer = this.node.layer;
        trace.addComponent(UITransform).setContentSize(ut.width, ut.height);
        this._gTrace = trace.addComponent(Graphics);

        this._pointsLayer = new Node('Points');
        this._pointsLayer.parent = this.node;
        this._pointsLayer.layer = this.node.layer;

        this.node.on(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
    }

    loadLevel(levelNum: number): void {
        // 立刻丢弃上一关的 core，避免异步加载期间仍 isSolved() 导致重复 onWin / 错乱
        this._core = null;
        const gen = ++this._loadGeneration;

        this._donePairs.length = 0;
        this._moveCount = 0;
        this._drawing = false;
        this._startVertexId = null;
        this._pointsLayer.destroyAllChildren();
        this._vertexNodes.clear();
        this._gEdges.clear();
        this._gDone.clear();
        this._gTrace.clear();

        levelManager.loadLevelData(levelNum, (data) => {
            if (gen !== this._loadGeneration) {
                return;
            }
            this._initCore(data);
            this._initialized = true;
        });
    }

    onDestroy(): void {
        this.node.off(Node.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchCancel, this);
    }

    setCallbacks(cb: OneStrokeBoardCallbacks): void {
        this._callbacks = cb;
    }

    resetBoard(): void {
        if (!this._core) {
            return;
        }
        const level = this._core.level;
        this._donePairs.length = 0;
        this._moveCount = 0;
        this._drawing = false;
        this._startVertexId = null;
        this._pointsLayer.destroyAllChildren();
        this._vertexNodes.clear();
        this._gEdges.clear();
        this._gDone.clear();
        this._gTrace.clear();
        this._initCore(level);
    }

    private _initCore(level: OneStrokeLevelJson): void {
        this._core = new OneStrokeGameCore(level);
        this._cw = level.canvas.width;
        this._ch = level.canvas.height;
        const ut = this.node.getComponent(UITransform)!;
        const side = Math.min(ut.width, ut.height);
        this._scale = Math.min(side / this._cw, side / this._ch);
        this._vertexRadius = Math.max(14, Math.min(22, 18 * (this._scale / 0.85)));
        this._hitRadiusDesign = Math.max(28, 34 / this._scale);

        this._drawStaticEdges();
        this._createVertices();
        this._ensurePulseNode();
        this._syncCurrentPulse();
        this._redrawDone();
        this._redrawTrace();
    }

    private _designToLocal(dx: number, dy: number): Vec3 {
        const lx = (dx - this._cw * 0.5) * this._scale;
        const ly = (dy - this._ch * 0.5) * this._scale;
        return new Vec3(lx, ly, 0);
    }

    private _localToDesign(local: Vec3): { x: number; y: number } {
        const x = local.x / this._scale + this._cw * 0.5;
        const y = local.y / this._scale + this._ch * 0.5;
        return { x, y };
    }

    private _drawStaticEdges(): void {
        const g = this._gEdges;
        const core = this._core!;
        g.clear();
        g.lineWidth = EDGE_WIDTH_BASE;
        for (const ln of core.level.lines) {
            const pa = core.getVertexPos(ln.start)!;
            const pb = core.getVertexPos(ln.end)!;
            const va = this._designToLocal(pa.x, pa.y);
            const vb = this._designToLocal(pb.x, pb.y);
            g.strokeColor = EDGE_BASE;
            g.moveTo(va.x, va.y);
            g.lineTo(vb.x, vb.y);
            g.stroke();

            if (ln.lock) {
                const dx = vb.x - va.x;
                const dy = vb.y - va.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const tipX = vb.x - ux * (this._vertexRadius + 6);
                const tipY = vb.y - uy * (this._vertexRadius + 6);
                const px = -uy * 8;
                const py = ux * 8;
                g.strokeColor = EDGE_ARROW;
                g.lineWidth = EDGE_WIDTH_ARROW;
                g.moveTo(tipX, tipY);
                g.lineTo(tipX - ux * 12 + px, tipY - uy * 12 + py);
                g.lineTo(tipX - ux * 12 - px, tipY - uy * 12 - py);
                g.close();
                g.stroke();
                g.lineWidth = EDGE_WIDTH_BASE;
            }
        }
    }

    private _createVertices(): void {
        const core = this._core!;
        for (const id of core.getVertexIds()) {
            const p = core.getVertexPos(id)!;
            const lp = this._designToLocal(p.x, p.y);
            const n = new Node(`V_${id}`);
            n.parent = this._pointsLayer;
            n.layer = this._pointsLayer.layer;
            n.setPosition(lp);
            n.addComponent(UITransform).setContentSize(this._vertexRadius * 3, this._vertexRadius * 3);

            const g = n.addComponent(Graphics);
            g.fillColor = VERT_FILL;
            g.circle(0, 0, this._vertexRadius);
            g.fill();
            g.lineWidth = 2;
            g.strokeColor = VERT_STROKE;
            g.circle(0, 0, this._vertexRadius);
            g.stroke();

            const labelNode = new Node('Label');
            labelNode.parent = n;
            labelNode.layer = n.layer;
            const labelUt = labelNode.addComponent(UITransform);
            labelUt.setContentSize(40, 40);
            labelUt.setAnchorPoint(0.5, 0.5);
            const label = labelNode.addComponent(Label);
            label.string = '';
            label.fontSize = 20;
            label.color = new Color(255, 255, 255, 255);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            applyGlobalLabelFont(label);

            this._vertexNodes.set(id, n);
        }
    }

    private _ensurePulseNode(): void {
        if (this._pulseNode) {
            this._redrawPulseGraphics();
            return;
        }
        const n = new Node('CurrentPulse');
        n.parent = this.node;
        n.layer = this.node.layer;
        n.addComponent(UITransform).setAnchorPoint(0.5, 0.5);
        n.addComponent(Graphics);
        this._pulseNode = n;
        this._redrawPulseGraphics();
        n.active = false;
    }

    private _redrawPulseGraphics(): void {
        const g = this._pulseNode?.getComponent(Graphics);
        if (!g) {
            return;
        }
        g.clear();
        const r = this._vertexRadius + 8;
        g.strokeColor = PULSE_RING;
        g.lineWidth = 2.5;
        g.circle(0, 0, r);
        g.stroke();
        g.strokeColor = new Color(PULSE_RING.r, PULSE_RING.g, PULSE_RING.b, 85);
        g.lineWidth = 1.5;
        g.circle(0, 0, r + 8);
        g.stroke();
    }

    /** 走完第一条边后才显示：标记下一步必须从此点继续 */
    private _syncCurrentPulse(): void {
        const core = this._core;
        if (!this._pulseNode) {
            return;
        }
        const show =
            !!core &&
            !core.isSolved() &&
            this._moveCount >= 1 &&
            core.currentVertexId != null;
        if (!show) {
            this._pulseActive = false;
            this._pulseNode.active = false;
            return;
        }
        const id = core!.currentVertexId!;
        const p = core!.getVertexPos(id)!;
        const lp = this._designToLocal(p.x, p.y);
        this._pulseNode.setPosition(lp.x, lp.y, 0);
        this._pulseNode.setScale(1, 1, 1);
        this._pulsePhase = 0;
        this._pulseNode.active = true;
        this._pulseActive = true;
    }

    protected update(dt: number): void {
        if (!this._pulseActive || !this._pulseNode?.active) {
            return;
        }
        this._pulsePhase += dt * Math.PI * 2.2;
        const amp = 0.13;
        const s = 1 + Math.sin(this._pulsePhase) * amp;
        this._pulseNode.setScale(s, s, 1);
    }

    private _nearestVertexId(local: Vec3): string | null {
        const core = this._core;
        if (!core) {
            return null;
        }
        const d = this._localToDesign(local);
        let best: string | null = null;
        let bestDist = this._hitRadiusDesign;
        for (const id of core.getVertexIds()) {
            const p = core.getVertexPos(id)!;
            const dx = p.x - d.x;
            const dy = p.y - d.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= bestDist) {
                bestDist = dist;
                best = id;
            }
        }
        return best;
    }

    /** 尝试沿合法边走到 target；成功则更新记录与回调 */
    private _attemptMoveTo(target: string | null): boolean {
        const core = this._core;
        if (!core || core.isSolved() || !target) {
            return false;
        }
        const cur = core.currentVertexId;
        if (!cur || target === cur) {
            return false;
        }
        if (!core.tryMoveTo(target)) {
            return false;
        }
        this._donePairs.push({ a: cur, b: target });
        this._moveCount += 1;
        if (this._moveCount === 1) {
            this._startVertexId = cur;
            this._showStartLabel(cur, 'S');
        }
        this._callbacks.onStep?.(this._moveCount);
        this._redrawDone();
        if (core.isSolved()) {
            this._callbacks.onWin?.();
        }
        this._syncCurrentPulse();
        return true;
    }

    private _onTouchStart(e: EventTouch): void {
        const lp = this._getLocalPos(e);
        const vid = this._nearestVertexId(lp);
        const core = this._core;
        if (!core || core.isSolved()) {
            return;
        }

        if (core.currentVertexId == null) {
            if (vid && core.tryBegin(vid)) {
                this._drawing = true;
                this._fingerLocal.set(lp);
                this._redrawTrace();
            }
        } else if (vid === core.currentVertexId) {
            this._drawing = true;
            this._fingerLocal.set(lp);
            this._redrawTrace();
        }
    }

    private _onTouchMove(e: EventTouch): void {
        const core = this._core;
        if (!this._drawing || !core?.currentVertexId) {
            return;
        }
        const lp = this._getLocalPos(e);
        this._fingerLocal.set(lp);
        const vid = this._nearestVertexId(lp);
        this._attemptMoveTo(vid);
        this._redrawTrace();
    }

    private _onTouchEnd(e: EventTouch): void {
        const core = this._core;
        if (!core || core.isSolved()) {
            this._drawing = false;
            this._redrawTrace();
            return;
        }
        const lp = this._getLocalPos(e);
        const target = this._nearestVertexId(lp);
        this._attemptMoveTo(target);

        this._drawing = false;
        this._redrawTrace();
    }

    private _onTouchCancel(): void {
        this._core?.cancelStroke();
        this._drawing = false;
        this._syncCurrentPulse();
        this._redrawTrace();
    }

    private _getLocalPos(e: EventTouch): Vec3 {
        const ui = this.node.getComponent(UITransform)!;
        return ui.convertToNodeSpaceAR(new Vec3(e.getUILocation().x, e.getUILocation().y, 0));
    }

    private _redrawDone(): void {
        const g = this._gDone;
        g.clear();
        g.lineWidth = EDGE_WIDTH_DONE;
        g.strokeColor = DONE_LINE;
        const core = this._core!;
        for (const { a, b } of this._donePairs) {
            const pa = core.getVertexPos(a)!;
            const pb = core.getVertexPos(b)!;
            const va = this._designToLocal(pa.x, pa.y);
            const vb = this._designToLocal(pb.x, pb.y);
            g.moveTo(va.x, va.y);
            g.lineTo(vb.x, vb.y);
            g.stroke();
        }
    }

    private _redrawTrace(): void {
        const g = this._gTrace;
        g.clear();
        const core = this._core;
        if (!this._drawing || !core?.currentVertexId) {
            return;
        }
        const cur = core.getVertexPos(core.currentVertexId)!;
        const vc = this._designToLocal(cur.x, cur.y);
        g.lineWidth = EDGE_WIDTH_TRACE;
        g.strokeColor = RUBBER;
        g.moveTo(vc.x, vc.y);
        g.lineTo(this._fingerLocal.x, this._fingerLocal.y);
        g.stroke();
    }

    private _showStartLabel(vertexId: string, text: string): void {
        const node = this._vertexNodes.get(vertexId);
        if (!node) {
            return;
        }
        const labelNode = node.getChildByName('Label');
        if (!labelNode) {
            return;
        }
        const label = labelNode.getComponent(Label);
        if (label) {
            label.string = text;
        }
    }
}
