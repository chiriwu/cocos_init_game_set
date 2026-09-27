export interface Tube {
    colors: string[];
}

/** 关卡配置：试管数、颜色数、空管数由 tubes / colors 描述，可选字段供关卡编辑对齐 */
export interface LevelConfig {
    /** 每管最大层数，默认 4 */
    capacity?: number;
    /** 本关使用的颜色 id 列表 */
    colors: string[];
    /** 每管液体，索引 0 为底部，末尾为顶部；空管 [] */
    tubes: string[][];
    /** 可选：试管总数（与 tubes.length 一致时可省略） */
    tubeCount?: number;
    /** 可选：颜色种类数（与 colors.length 一致时可省略） */
    colorCount?: number;
    /** 可选：空试管数量 */
    emptyTubeCount?: number;
}

export class PourWaterCore {
    private _tubes: Tube[] = [];
    private _colors: string[] = [];
    private _capacity = 4;
    private _history: string[][][] = [];
    private _isPlaying = false;

    get tubes(): Tube[] {
        return this._tubes;
    }

    get capacity(): number {
        return this._capacity;
    }

    get colors(): string[] {
        return this._colors;
    }

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    startLevel(config: LevelConfig): void {
        this._capacity = config.capacity ?? 4;
        this._colors = [...config.colors];
        this._tubes = config.tubes.map((colors) => ({
            colors: colors.slice(0, this._capacity),
        }));
        this._history = [];
        this._isPlaying = true;
    }

    canPour(fromIndex: number, toIndex: number): boolean {
        if (fromIndex === toIndex) return false;
        if (fromIndex < 0 || fromIndex >= this._tubes.length) return false;
        if (toIndex < 0 || toIndex >= this._tubes.length) return false;

        const fromTube = this._tubes[fromIndex];
        const toTube = this._tubes[toIndex];

        if (fromTube.colors.length === 0) return false;
        if (toTube.colors.length >= this._capacity) return false;

        const fromTopColor = fromTube.colors[fromTube.colors.length - 1];
        const toTopColor =
            toTube.colors.length > 0 ? toTube.colors[toTube.colors.length - 1] : null;

        return toTopColor === null || toTopColor === fromTopColor;
    }

    pour(fromIndex: number, toIndex: number): boolean {
        if (!this.canPour(fromIndex, toIndex)) return false;

        this._saveHistory();

        const fromTube = this._tubes[fromIndex];
        const toTube = this._tubes[toIndex];
        const fromTopColor = fromTube.colors[fromTube.colors.length - 1];

        let pouredCount = 0;
        while (
            fromTube.colors.length > 0 &&
            toTube.colors.length < this._capacity &&
            fromTube.colors[fromTube.colors.length - 1] === fromTopColor
        ) {
            const color = fromTube.colors.pop()!;
            toTube.colors.push(color);
            pouredCount++;
        }

        return pouredCount > 0;
    }

    undo(): boolean {
        if (this._history.length === 0) return false;

        const saved = this._history.pop()!;
        this._tubes = saved.map((colors) => ({ colors: [...colors] }));
        return true;
    }

    isLevelCompleted(): boolean {
        for (const tube of this._tubes) {
            if (tube.colors.length === 0) continue;
            if (tube.colors.length !== this._capacity) return false;

            const firstColor = tube.colors[0];
            for (const color of tube.colors) {
                if (color !== firstColor) return false;
            }
        }
        return true;
    }

    private _saveHistory(): void {
        const saved = this._tubes.map((t) => [...t.colors]);
        this._history.push(saved);
    }

    reset(): void {
        this._tubes = [];
        this._colors = [];
        this._capacity = 4;
        this._history = [];
        this._isPlaying = false;
    }
}

export const POUR_WATER_LEVELS: LevelConfig[] = [
    {
        capacity: 4,
        colors: ['red', 'blue', 'green'],
        colorCount: 3,
        tubeCount: 4,
        emptyTubeCount: 1,
        tubes: [
            ['red', 'blue', 'green', 'red'],
            ['blue', 'green', 'red', 'blue'],
            ['green', 'red', 'blue', 'green'],
            [],
        ],
    },
    {
        capacity: 4,
        colors: ['red', 'blue', 'green'],
        colorCount: 3,
        tubeCount: 4,
        emptyTubeCount: 1,
        tubes: [
            ['red', 'blue', 'green'],
            ['green', 'red', 'blue'],
            ['blue', 'green', 'red'],
            [],
        ],
    },
    {
        capacity: 4,
        colors: ['red', 'blue', 'green', 'yellow'],
        colorCount: 4,
        tubeCount: 6,
        emptyTubeCount: 2,
        tubes: [
            ['red', 'blue', 'green', 'yellow'],
            ['yellow', 'red', 'blue', 'green'],
            ['green', 'yellow', 'red', 'blue'],
            ['blue', 'green', 'yellow', 'red'],
            [],
            [],
        ],
    },
    {
        capacity: 4,
        colors: ['red', 'blue', 'green', 'orange', 'purple'],
        colorCount: 5,
        tubeCount: 8,
        emptyTubeCount: 3,
        tubes: [
            ['red', 'blue', 'green', 'orange'],
            ['purple', 'red', 'blue', 'green'],
            ['orange', 'purple', 'red', 'blue'],
            ['green', 'orange', 'purple', 'red'],
            ['blue', 'green', 'orange', 'purple'],
            [],
            [],
            [],
        ],
    },
];
