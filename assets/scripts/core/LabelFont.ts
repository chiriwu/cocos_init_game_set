import { Label } from 'cc';

/** 项目全局正文字体（系统楷体） */
export const GLOBAL_FONT_FAMILY = 'KaiTi';

/** 为 Label 应用全局楷体；图标位图字体请勿调用 */
export function applyGlobalLabelFont(label: Label): void {
    label.font = null;
    label.useSystemFont = true;
    label.fontFamily = GLOBAL_FONT_FAMILY;
}
