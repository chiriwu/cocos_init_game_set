import type { OneStrokeLevelJson } from './OneStrokeLevelTypes';

/** 一条边的剩余可走次数（无向时正反共用同一对象） */
export class EdgeState {
    remaining: number;
    readonly lineId: number;
    readonly start: string;
    readonly end: string;
    readonly lock: boolean;

    constructor(lineId: number, start: string, end: string, repeat: number, lock: boolean) {
        this.lineId = lineId;
        this.start = start;
        this.end = end;
        this.remaining = repeat;
        this.lock = lock;
    }
}

/**
 * 一笔画核心：邻接表 + 剩余遍程；无向边正反共享 EdgeState；lock 仅保留 start→end。
 */
export class OneStrokeGameCore {
    readonly level: OneStrokeLevelJson;
    /** adj[fromId][toId] = EdgeState */
    private readonly adj = new Map<string, Map<string, EdgeState>>();
    private readonly vertices = new Map<string, { x: number; y: number }>();
    /** 当前所在顶点 id，null 表示尚未落笔 */
    currentVertexId: string | null = null;
    /** 剩余要走完的「单次边穿越」总数 */
    totalRemaining = 0;

    constructor(level: OneStrokeLevelJson) {
        this.level = level;
        for (const v of level.v2) {
            this.vertices.set(v.id, { x: v.x, y: v.y });
        }
        for (const ln of level.lines) {
            const r = ln.repeat != null && ln.repeat > 0 ? ln.repeat : 1;
            const lock = !!ln.lock;
            const edge = new EdgeState(ln.id, ln.start, ln.end, r, lock);
            this.totalRemaining += r;
            this._link(ln.start, ln.end, edge);
            if (!lock) {
                this._link(ln.end, ln.start, edge);
            }
        }
    }

    private _link(a: string, b: string, edge: EdgeState): void {
        if (!this.adj.has(a)) {
            this.adj.set(a, new Map());
        }
        this.adj.get(a)!.set(b, edge);
    }

    getVertexIds(): string[] {
        return [...this.vertices.keys()];
    }

    getVertexPos(id: string): { x: number; y: number } | undefined {
        return this.vertices.get(id);
    }

    /** 是否还存在未走完的边 */
    isSolved(): boolean {
        return this.totalRemaining <= 0;
    }

    /** 当前可否从 cur 沿边走到 next */
    canTraverse(cur: string, next: string): boolean {
        const e = this.adj.get(cur)?.get(next);
        return !!e && e.remaining > 0;
    }

    /**
     * 尝试落笔起点（当前不在任何点上时）
     */
    tryBegin(vertexId: string): boolean {
        if (this.currentVertexId != null) {
            return false;
        }
        if (!this.vertices.has(vertexId)) {
            return false;
        }
        const outs = this.adj.get(vertexId);
        if (!outs) {
            return false;
        }
        for (const e of outs.values()) {
            if (e.remaining > 0) {
                this.currentVertexId = vertexId;
                return true;
            }
        }
        return false;
    }

    /**
     * 从当前点走到相邻点（已成功 begin 之后）
     */
    tryMoveTo(nextVertexId: string): boolean {
        const cur = this.currentVertexId;
        if (cur == null) {
            return false;
        }
        const edge = this.adj.get(cur)?.get(nextVertexId);
        if (!edge || edge.remaining <= 0) {
            return false;
        }
        edge.remaining -= 1;
        this.totalRemaining -= 1;
        this.currentVertexId = nextVertexId;
        return true;
    }

    /** 抬起手指但未移到另一点时调用：取消本次笔画起点 */
    cancelStroke(): void {
        this.currentVertexId = null;
    }

    getEdgeState(from: string, to: string): EdgeState | undefined {
        return this.adj.get(from)?.get(to);
    }
}
