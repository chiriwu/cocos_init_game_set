import { Color } from 'cc';

/**
 * 全局广告位开关：true=显示广告位，false=隐藏广告位
 * 一处修改处处生效：影响 buildGameChromeAdStrip 的绘制、getBottomActionBarCenterY 的按钮位置、各游戏区域的可用高度
 */
export const GAME_CHROME_AD_ENABLED = true;

/** 游戏界面颜色配置 */
export const GAME_CHROME_PALETTE = {
    PRIMARY: new Color(90, 114, 123, 255),      // 主色调（按钮背景、标题等）
    PRIMARY_BLUE: new Color(8, 139, 201, 255), // 按钮蓝色背景（主页、刷新等）
    LINE: new Color(203, 213, 217, 255),        // 分割线颜色
    ON_PRIMARY: new Color(247, 245, 240, 255),   // 主色上的文字颜色（白色）
    MUTED: new Color(137, 150, 156, 255),       // 次要文字颜色（灰色）
    AD_BG: new Color(230, 230, 230, 200),        // 广告区域背景色
    BOARD_BG: new Color(178, 198, 214, 255),     // 游戏面板背景色 (#B2C6D6)
};

/** 游戏界面布局尺寸配置 */
export const GAME_CHROME_LAYOUT = {
    AD_HEIGHT_MIN: 88,      // 广告条最小高度（px），适配小屏手机
    AD_HEIGHT_MAX: 120,     // 广告条最大高度（px），适配大屏手机
    AD_HEIGHT_RATIO: 0.14,  // 广告条高度 = 屏幕高度 × 此比例

    ACTION_BAR_HEIGHT: 60,   // 底部按钮区域高度（px）
    ACTION_BAR_GAP: 16,      // 按钮区域与相邻区域（白板/广告）的间距（px）
    ACTION_BAR_CENTER_OFFSET: 40,  // 按钮区域中心相对于广告顶部的偏移量（px）

    MARGIN_X: 14,           // 内容区域左右边距（px）
    MARGIN_TOP: 24,         // 内容区域顶部边距（px）
    INNER_PAD: 10,          // 内容区域内边距（px）
    BLOCK_GAP: 8,           // 区块之间的间距（px）
};

/** 游戏界面按钮尺寸配置 */
export const GAME_CHROME_BUTTON = {
    SIZE_SMALL: 46,         // 小按钮尺寸（圆形按钮直径，px）
    SIZE_LARGE: 52,         // 大按钮尺寸（圆形按钮直径，px）
    FONT_SIZE_SMALL: 18,    // 小按钮字体大小（px）
    FONT_SIZE_LARGE: 20,   // 大按钮字体大小（px）
};

/** 默认屏幕尺寸（用于 Canvas 尺寸未知时的兜底值） */
export const GAME_DEFAULT_SCREEN = {
    WIDTH: 750,             // 默认屏幕宽度（px）
    HEIGHT: 1280,           // 默认屏幕高度（px）
};