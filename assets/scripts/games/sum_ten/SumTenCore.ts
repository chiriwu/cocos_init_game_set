export const SUM_TEN_ROWS = 10;
export const SUM_TEN_COLS = 10;

export interface GridRect {
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
}

/** 0 表示已消除的空格，1–9 为数字 */
export type GridCell = number;

export class SumTenCore {
    static readonly ROWS = SUM_TEN_ROWS;
    static readonly COLS = SUM_TEN_COLS;

    private _grid: GridCell[][] = [];
    private _level = 1;

    get grid(): readonly (readonly GridCell[])[] {
        return this._grid;
    }

    get level(): number {
        return this._level;
    }

    reset(): void {
        this._grid = [];
        this._level = 1;
    }

    /**
     * 逆向构造可解棋盘：
     * 从空棋盘（全 0）开始，反复选取一个全 0 矩形，填入一组和为 10 的数字。
     * 这样得到的棋盘，玩家按相反顺序框选这些矩形即可逐个消除，必定存在解。
     */
    startLevel(level = this._level): void {
        this._level = level;
        this._grid = Array.from({ length: SUM_TEN_ROWS }, () =>
            Array<GridCell>(SUM_TEN_COLS).fill(0),
        );

        const maxIter = SUM_TEN_ROWS * SUM_TEN_COLS;
        for (let i = 0; i < maxIter; i++) {
            const rect = this._pickEmptyRect();
            if (!rect) break;
            const size = (rect.maxRow - rect.minRow + 1) * (rect.maxCol - rect.minCol + 1);
            const nums = this._pickNumbersSummingToTen(size);
            if (nums.length === 0) break;
            this._fillRect(rect, nums);
        }
    }

    /** 在全 0 区域中随机选取一个矩形（面积 2–10），找不到返回 null */
    private _pickEmptyRect(): GridRect | null {
        const zeros: { r: number; c: number }[] = [];
        for (let r = 0; r < SUM_TEN_ROWS; r++) {
            for (let c = 0; c < SUM_TEN_COLS; c++) {
                if (this._grid[r][c] === 0) zeros.push({ r, c });
            }
        }
        // 尝试若干次随机锚点，找到合法矩形
        for (let attempt = 0; attempt < zeros.length; attempt++) {
            const anchor = zeros[Math.floor(Math.random() * zeros.length)];
            const r0 = anchor.r;
            const c0 = anchor.c;

            // 向右找该行连续 0 的最大宽度
            let maxW = 0;
            for (let c = c0; c < SUM_TEN_COLS; c++) {
                if (this._grid[r0][c] === 0) maxW++;
                else break;
            }

            // 限制单边长，避免矩形过大
            maxW = Math.min(maxW, 5);

            let best: GridRect | null = null;
            // 尝试不同宽高组合，取第一个满足面积 2–10 的
            outer: for (let w = maxW; w >= 1; w--) {
                const c1 = c0 + w - 1;
                // 向下找有多少行在 [c0, c1] 区间内全为 0
                let maxH = 0;
                for (let r = r0; r < SUM_TEN_ROWS; r++) {
                    let ok = true;
                    for (let c = c0; c <= c1; c++) {
                        if (this._grid[r][c] !== 0) { ok = false; break; }
                    }
                    if (ok) maxH++;
                    else break;
                }
                maxH = Math.min(maxH, 5);
                for (let h = maxH; h >= 1; h--) {
                    const size = w * h;
                    if (size >= 2 && size <= 10) {
                        best = { minRow: r0, maxRow: r0 + h - 1, minCol: c0, maxCol: c1 };
                        break outer;
                    }
                }
            }
            if (best) return best;
        }
        return null;
    }

    /** 生成 k 个 1–9 的数字，和为 10；k 不在 [2,10] 时返回空数组 */
    private _pickNumbersSummingToTen(k: number): number[] {
        if (k < 2 || k > 10) return [];
        const nums = Array<number>(k).fill(1);
        let remaining = 10 - k;
        while (remaining > 0) {
            const idx = Math.floor(Math.random() * k);
            if (nums[idx] < 9) {
                nums[idx]++;
                remaining--;
            }
        }
        return nums;
    }

    /** 将一组数字按行优先填入矩形 */
    private _fillRect(rect: GridRect, nums: number[]): void {
        let idx = 0;
        for (let r = rect.minRow; r <= rect.maxRow; r++) {
            for (let c = rect.minCol; c <= rect.maxCol; c++) {
                this._grid[r][c] = nums[idx++] ?? 0;
            }
        }
    }

    /** 将触摸起止格点规范化为闭区间矩形 */
    normalizeRect(r0: number, c0: number, r1: number, c1: number): GridRect {
        return {
            minRow: Math.min(r0, r1),
            maxRow: Math.max(r0, r1),
            minCol: Math.min(c0, c1),
            maxCol: Math.max(c0, c1),
        };
    }

    /** 矩形内所有非空数字之和 */
    sumInRect(rect: GridRect): number {
        let sum = 0;
        for (let r = rect.minRow; r <= rect.maxRow; r++) {
            for (let c = rect.minCol; c <= rect.maxCol; c++) {
                const v = this._grid[r]?.[c] ?? 0;
                if (v > 0) {
                    sum += v;
                }
            }
        }
        return sum;
    }

    /** 和为 10 时消除矩形内所有非空数字，否则不变 */
    tryClearRect(rect: GridRect): boolean {
        if (this.sumInRect(rect) !== 10) {
            return false;
        }
        for (let r = rect.minRow; r <= rect.maxRow; r++) {
            for (let c = rect.minCol; c <= rect.maxCol; c++) {
                if (this._grid[r]?.[c] > 0) {
                    this._grid[r][c] = 0;
                }
            }
        }
        return true;
    }

    isCleared(): boolean {
        for (let r = 0; r < SUM_TEN_ROWS; r++) {
            for (let c = 0; c < SUM_TEN_COLS; c++) {
                if (this._grid[r][c] > 0) {
                    return false;
                }
            }
        }
        return true;
    }

    advanceLevel(): void {
        this._level += 1;
        this.startLevel(this._level);
    }
}
