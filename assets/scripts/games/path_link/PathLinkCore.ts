import { PATH_LINK_LEVELS, PathLinkLevelDef, PathLinkCell } from './PathLinkData';

export type { PathLinkCell, PathLinkCellType } from './PathLinkData';

export interface GridPos {
    row: number;
    col: number;
}

export type PathSlideResult = 'started' | 'extended' | 'truncated' | 'win' | 'failed' | 'ignored';

export class PathLinkCore {
    private _levelIndex = 0;
    private _path: GridPos[] = [];
    private _failed = false;
    private _failPos: GridPos | null = null;

    get levelIndex(): number {
        return this._levelIndex;
    }

    get path(): readonly GridPos[] {
        return this._path;
    }

    get isFailed(): boolean {
        return this._failed;
    }

    get failPos(): GridPos | null {
        return this._failPos;
    }

    get levelDef(): PathLinkLevelDef {
        return PATH_LINK_LEVELS[this._levelIndex] ?? PATH_LINK_LEVELS[0];
    }

    get totalSteps(): number {
        return this.levelDef.totalSteps;
    }

    /** 规则条展示的星星步数 */
    get starRules(): number[] {
        return [...this.levelDef.starSteps].sort((a, b) => a - b);
    }

    reset(): void {
        this._path = [];
        this._levelIndex = 0;
        this._failed = false;
        this._failPos = null;
    }

    startLevel(index = this._levelIndex): void {
        this._levelIndex = Math.max(0, Math.min(index, PATH_LINK_LEVELS.length - 1));
        this._path = [];
        this._failed = false;
        this._failPos = null;
    }

    cellAt(row: number, col: number): PathLinkCell | null {
        const { grid } = this.levelDef;
        return grid[row]?.[col] ?? null;
    }

    isInPath(row: number, col: number): boolean {
        return this._path.some((p) => p.row === row && p.col === col);
    }

    pathStepAt(row: number, col: number): number {
        const idx = this._path.findIndex((p) => p.row === row && p.col === col);
        return idx >= 0 ? idx + 1 : 0;
    }

    isAdjacent(a: GridPos, b: GridPos): boolean {
        const dr = Math.abs(a.row - b.row);
        const dc = Math.abs(a.col - b.col);
        return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
    }

    /** 数字格专用步数（如第 6 步必须踩带 6 的格） */
    private _numberedStepSet(): Set<number> {
        const set = new Set<number>();
        for (const row of this.levelDef.grid) {
            for (const cell of row) {
                if (cell.type === 'step' && cell.requiredStep != null) {
                    set.add(cell.requiredStep);
                }
            }
        }
        return set;
    }

    /** 该格在指定步数是否允许落脚（不含相邻性） */
    canLandAtStep(row: number, col: number, step: number): boolean {
        const cell = this.cellAt(row, col);
        if (!cell) {
            return false;
        }
        const starSteps = this.levelDef.starSteps;
        const numberedSteps = this._numberedStepSet();

        if (cell.type === 'end') {
            return step === this.totalSteps;
        }
        if (cell.type === 'step') {
            return cell.requiredStep === step;
        }
        if (cell.type === 'star') {
            return starSteps.includes(step);
        }
        if (cell.type === 'dot') {
            if (starSteps.includes(step)) {
                return false;
            }
            if (numberedSteps.has(step)) {
                return false;
            }
            return true;
        }
        return false;
    }

    tryStart(row: number, col: number): PathSlideResult {
        if (this._failed) {
            return 'ignored';
        }
        if (this._path.length > 0) {
            return 'ignored';
        }
        if (!this.canLandAtStep(row, col, 1)) {
            return this._markFailed(row, col);
        }
        this._path.push({ row, col });
        return 'started';
    }

    trySlideTo(row: number, col: number): PathSlideResult {
        if (this._failed) {
            return 'ignored';
        }
        if (this._path.length === 0) {
            return this.tryStart(row, col);
        }

        const idx = this._path.findIndex((p) => p.row === row && p.col === col);
        if (idx >= 0) {
            if (idx === this._path.length - 1) {
                return 'ignored';
            }
            this._path = this._path.slice(0, idx + 1);
            this._failPos = null;
            return 'truncated';
        }

        const last = this._path[this._path.length - 1];
        if (!this.isAdjacent(last, { row, col })) {
            return 'ignored';
        }

        const nextStep = this._path.length + 1;
        if (nextStep > this.totalSteps) {
            return this._markFailed(row, col);
        }
        if (!this.canLandAtStep(row, col, nextStep)) {
            return this._markFailed(row, col);
        }

        this._path.push({ row, col });
        if (this._path.length === this.totalSteps && this._isComplete()) {
            return 'win';
        }
        return 'extended';
    }

    checkWinOnRelease(): boolean {
        return !this._failed && this._path.length === this.totalSteps && this._isComplete();
    }

    /** 失败时把目标格加入路径，便于画连线到红格 */
    private _markFailed(row: number, col: number): PathSlideResult {
        this._failed = true;
        this._failPos = { row, col };
        if (!this.isInPath(row, col)) {
            this._path.push({ row, col });
        }
        return 'failed';
    }

    private _isComplete(): boolean {
        if (this._path.length !== this.totalSteps) {
            return false;
        }
        const last = this._path[this._path.length - 1];
        if (this.cellAt(last.row, last.col)?.type !== 'end') {
            return false;
        }

        const starStepsHit: number[] = [];
        for (let i = 0; i < this._path.length; i++) {
            const step = i + 1;
            const pos = this._path[i];
            const cell = this.cellAt(pos.row, pos.col);
            if (!cell || !this.canLandAtStep(pos.row, pos.col, step)) {
                return false;
            }
            if (cell.type === 'star') {
                starStepsHit.push(step);
            }
        }

        const expected = [...this.levelDef.starSteps].sort((a, b) => a - b);
        starStepsHit.sort((a, b) => a - b);
        if (starStepsHit.length !== expected.length) {
            return false;
        }
        for (let i = 0; i < expected.length; i++) {
            if (starStepsHit[i] !== expected[i]) {
                return false;
            }
        }
        return true;
    }

    advanceLevel(): boolean {
        if (this._levelIndex + 1 >= PATH_LINK_LEVELS.length) {
            return false;
        }
        this.startLevel(this._levelIndex + 1);
        return true;
    }
}
