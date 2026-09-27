import { SPOT_DIFF_CHAR_PAIRS } from './SpotDiffData';

export interface LevelConfig {
    gridSize: number;
    mainChar: string;
    targetChar: string;
    timeLimit: number;
}

export class SpotDiffCore {
    private _currentLevel: LevelConfig | null = null;
    private _targetPosition: { row: number; col: number } | null = null;
    private _isPlaying: boolean = false;
    // 公共配置变量，方便后期修改
    private readonly _gridSize: number = 12;
    private readonly _timeLimit: number = 30; //每关限制时间
    // 关卡数据，在构造函数中一次性生成
    private readonly _levels: LevelConfig[];

    constructor() {
        this._levels = this._generateLevels();
    }

    private _generateLevels(): LevelConfig[] {
        return SPOT_DIFF_CHAR_PAIRS.map(pair => ({
            gridSize: this._gridSize,
            mainChar: pair.mainChar,
            targetChar: pair.targetChar,
            timeLimit: this._timeLimit,
        }));
    }

    get currentLevel(): LevelConfig | null {
        return this._currentLevel;
    }

    get targetPosition(): { row: number; col: number } | null {
        return this._targetPosition;
    }

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    startLevel(levelIndex: number): void {
        this._currentLevel = this._getLevelConfig(levelIndex);
        if (this._currentLevel) {
            this._generateTargetPosition();
            this._isPlaying = true;
        }
    }

    checkPosition(row: number, col: number): boolean {
        if (!this._targetPosition || !this._isPlaying) return false;
        return this._targetPosition.row === row && this._targetPosition.col === col;
    }

    getLevelConfig(levelIndex: number): LevelConfig {
        return this._getLevelConfig(levelIndex);
    }

    get totalLevels(): number {
        return this._levels.length;
    }

    reset(): void {
        this._currentLevel = null;
        this._targetPosition = null;
        this._isPlaying = false;
    }

    private _getLevelConfig(index: number): LevelConfig {
        return this._levels[index] || this._levels[0];
    }

    private _generateTargetPosition(): void {
        if (!this._currentLevel) return;
        const size = this._currentLevel.gridSize;
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        this._targetPosition = { row, col };
    }
}
