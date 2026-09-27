import { sys } from 'cc';
import { LOBBY_CATEGORIES } from '../lobby/LobbyData';
import { isGameRegistered } from './GameRegistry';

/** 分享链接 / 启动参数中的游戏 id 字段名 */
export const GAME_SHARE_QUERY_KEY = 'game';

export interface GameShareOptions {
    title?: string;
    /** 分享文案；默认「来一起玩{游戏名}！」 */
    message?: string;
}

type WxLike = {
    shareAppMessage?: (opts: { title: string; query?: string; imageUrl?: string }) => void;
    showToast?: (opts: { title: string; icon?: string; duration?: number }) => void;
    getLaunchOptionsSync?: () => { query?: Record<string, string> };
    onShow?: (cb: (res: { query?: Record<string, string> }) => void) => void;
};

let shareBaseUrl = '';
let platformHooksReady = false;

/** 部署后可在启动时设置正式域名，如 https://game.example.com/index.html */
export function setGameShareBaseUrl(url: string): void {
    shareBaseUrl = url.trim();
}

export function getGameTitle(gameId: string): string {
    for (const category of LOBBY_CATEGORIES) {
        const game = category.games.find((item) => item.id === gameId);
        if (game) {
            return game.title;
        }
    }
    return gameId;
}

/** 生成带 game 参数的分享链接，点击后可直接进入对应游戏 */
export function buildGameShareLink(gameId: string): string {
    const base = shareBaseUrl || resolveRuntimeBaseUrl();
    try {
        const url = new URL(base);
        url.searchParams.set(GAME_SHARE_QUERY_KEY, gameId);
        return url.toString();
    } catch {
        const joiner = base.includes('?') ? '&' : '?';
        return `${base}${joiner}${GAME_SHARE_QUERY_KEY}=${encodeURIComponent(gameId)}`;
    }
}

/** 从 Web URL 或微信启动参数解析要进入的游戏 id */
export function parseLaunchGameId(source?: Record<string, string | undefined>): string | null {
    const raw = source?.[GAME_SHARE_QUERY_KEY];
    if (typeof raw === 'string' && raw && isGameRegistered(raw)) {
        return raw;
    }
    return null;
}

/** 注册微信 onShow 等监听，需在应用启动时调用一次 */
export function initGameSharePlatformHooks(onLaunchGame: (gameId: string) => void): void {
    if (platformHooksReady) {
        return;
    }
    platformHooksReady = true;

    const wx = getWx();
    if (!wx?.onShow) {
        return;
    }

    wx.onShow((res) => {
        const gameId = parseLaunchGameId(res?.query);
        if (gameId) {
            onLaunchGame(gameId);
        }
    });
}

/** 所有游戏分享按钮统一调用 */
export function shareGame(gameId: string, options?: GameShareOptions): void {
    if (!isGameRegistered(gameId)) {
        console.warn(`[GameShare] 未注册的游戏 id: ${gameId}`);
        return;
    }

    const title = options?.title ?? getGameTitle(gameId);
    const message = options?.message ?? `来一起玩${title}！`;
    const link = buildGameShareLink(gameId);

    if (tryWeChatShare(gameId, title, message)) {
        return;
    }

    void shareOnWeb(title, message, link);
}

function parseQueryString(search: string): Record<string, string> {
    const result: Record<string, string> = {};
    const clean = search.replace(/^\?/, '');
    if (!clean) {
        return result;
    }
    for (const pair of clean.split('&')) {
        if (pair) {
            const eq = pair.indexOf('=');
            const rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
            const rawValue = eq >= 0 ? pair.slice(eq + 1) : '';
            try {
                result[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
            } catch {
                result[rawKey] = rawValue;
            }
        }
    }
    return result;
}

function resolveRuntimeBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location?.href) {
        const { origin, pathname, search } = window.location;
        const params = parseQueryString(search);
        delete params[GAME_SHARE_QUERY_KEY];
        const query = Object.keys(params)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
        return `${origin}${pathname}${query ? `?${query}` : ''}`;
    }
    return 'https://example.com/';
}

function getWx(): WxLike | undefined {
    return (globalThis as { wx?: WxLike }).wx;
}

function tryWeChatShare(gameId: string, title: string, message: string): boolean {
    const wx = getWx();
    if (!wx?.shareAppMessage) {
        return false;
    }

    wx.shareAppMessage({
        title: message,
        query: `${GAME_SHARE_QUERY_KEY}=${encodeURIComponent(gameId)}`,
    });
    return true;
}

async function shareOnWeb(title: string, message: string, link: string): Promise<void> {
    const text = `${message}\n${link}`;

    try {
        if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share({ title, text: message, url: link });
            return;
        }
    } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
            return;
        }
    }

    const copied = await copyText(link);
    showShareFeedback(copied ? '链接已复制，快去分享吧' : `请复制链接：${link}`);
}

async function copyText(text: string): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through
    }

    if (typeof document === 'undefined') {
        return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
}

function showShareFeedback(message: string): void {
    const wx = getWx();
    if (wx?.showToast) {
        wx.showToast({ title: message, icon: 'none', duration: 2200 });
        return;
    }
    if (sys.isBrowser && typeof window !== 'undefined') {
        window.alert(message);
        return;
    }
    console.log(`[GameShare] ${message}`);
}

/** 读取当前环境的启动 deep link（Web / 微信） */
export function readLaunchGameIdFromPlatform(): string | null {
    const wx = getWx();
    if (wx?.getLaunchOptionsSync) {
        const fromWx = parseLaunchGameId(wx.getLaunchOptionsSync()?.query);
        if (fromWx) {
            return fromWx;
        }
    }

    if (typeof window !== 'undefined' && window.location?.search) {
        const params = parseQueryString(window.location.search);
        const fromWeb = parseLaunchGameId({ [GAME_SHARE_QUERY_KEY]: params[GAME_SHARE_QUERY_KEY] });
        if (fromWeb) {
            return fromWeb;
        }
    }

    return null;
}
