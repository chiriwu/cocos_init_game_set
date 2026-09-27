import { assetManager, JsonAsset } from 'cc';
import type { OneStrokeLevelJson } from './OneStrokeLevelTypes';
import { DEFAULT_ONE_STROKE_LEVEL } from './OneStrokeDefaultLevel';
import { ONE_STROKE_LEVEL_UUIDS } from './OneStrokeLevelUuids';

export class OneStrokeLevelManager {
    private _currentLevel: number = 1;
    private _maxLevel: number = 0;

    get currentLevel(): number {
        return this._currentLevel;
    }

    get maxLevel(): number {
        return this._maxLevel;
    }

    /** 初始化：关卡列表来自 resource 目录对应的 UUID 表 */
    init(callback?: () => void): void {
        this._maxLevel = ONE_STROKE_LEVEL_UUIDS.length;
        console.log(`[LevelManager] 发现 ${this._maxLevel} 个关卡（resource/*.json）`);
        callback?.();
    }

    /** 按需加载指定关卡的数据 */
    loadLevelData(level: number, callback: (data: OneStrokeLevelJson) => void): void {
        const uuid = this.getLevelUuid(level);
        if (!uuid) {
            callback(DEFAULT_ONE_STROKE_LEVEL);
            return;
        }

        assetManager.loadAny({ uuid }, (err, asset: JsonAsset) => {
            if (err || !asset?.json) {
                console.warn(`[LevelManager] 加载关卡 ${level} 失败:`, err);
                callback(DEFAULT_ONE_STROKE_LEVEL);
                return;
            }
            callback(asset.json as OneStrokeLevelJson);
        });
    }

    getLevelUuid(level: number): string | null {
        const idx = level - 1;
        if (idx < 0 || idx >= ONE_STROKE_LEVEL_UUIDS.length) {
            return null;
        }
        return ONE_STROKE_LEVEL_UUIDS[idx];
    }

    nextLevel(): boolean {
        if (this._currentLevel >= this._maxLevel) {
            return false;
        }
        this._currentLevel += 1;
        return true;
    }

    resetToFirst(): void {
        this._currentLevel = 1;
    }
}

export const levelManager = new OneStrokeLevelManager();
