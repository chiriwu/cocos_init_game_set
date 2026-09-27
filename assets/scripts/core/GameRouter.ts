import { director } from 'cc';
import { initGameSharePlatformHooks, readLaunchGameIdFromPlatform } from './GameShare';
import { isGameRegistered } from './GameRegistry';

/**
 * 大厅 → 小游戏壳场景（GamePlay）的路由。
 * 后续可改为：loadBundle + 挂载 prefab，仍由 GamePlayShell 消费 pendingId。
 */
export class GameRouter {
    private static _pendingGameId: string | null = null;
    private static _platformHooksReady = false;

    static enter(gameId: string): void {
        if (!isGameRegistered(gameId)) {
            console.warn(`[GameRouter] 无法进入未注册游戏: ${gameId}`);
            return;
        }
        this._pendingGameId = gameId;
        director.loadScene('GamePlay');
    }

    static consumePendingGameId(): string | null {
        const id = this._pendingGameId;
        this._pendingGameId = null;
        return id;
    }

    /** 应用启动时调用：解析分享链接 / 微信 query，若有 game 则直接进入 */
    static tryEnterFromDeepLink(): boolean {
        this.ensurePlatformHooks();

        const gameId = readLaunchGameIdFromPlatform();
        if (!gameId) {
            return false;
        }

        this.enter(gameId);
        return true;
    }

    private static ensurePlatformHooks(): void {
        if (this._platformHooksReady) {
            return;
        }
        this._platformHooksReady = true;
        initGameSharePlatformHooks((gameId) => {
            this.enter(gameId);
        });
    }
}
