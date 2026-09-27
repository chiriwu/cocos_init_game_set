import { GAME_CHROME_AD_ENABLED } from './GameChromeConfig';

/** 子游戏底部公共布局常量（与竖屏 GameSlot 配合） */
export const GAME_CHROME_AD_STRIP_DEFAULT_H = 120;
export const GAME_CHROME_ACTION_ROW_DEFAULT_H = 100;

/**
 * 广告条当前高度：开关开启返回标准高度 120，关闭返回 0
 * 各游戏计算游戏区高度 / 按钮位置时应调用此函数而非直接引用常量
 */
export function getAdStripHeight(): number {
    return GAME_CHROME_AD_ENABLED ? GAME_CHROME_AD_STRIP_DEFAULT_H : 0;
}

/** 计算底部操作栏的中心 Y 坐标（联动广告开关：关闭时按钮下移到屏底） */
export function getBottomActionBarCenterY(screenHeight: number): number {
    return -screenHeight * 0.5 + getAdStripHeight() + GAME_CHROME_ACTION_ROW_DEFAULT_H * 0.5 + 10;
}
