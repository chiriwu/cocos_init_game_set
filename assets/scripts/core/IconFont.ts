import { Font, Label, Node, UITransform, Color, resources } from 'cc';
import { applyGlobalLabelFont } from './LabelFont';

export interface IconFontGlyph {
    name: string;
    unicode: string;
    unicodeDecimal: number;
}

export const ICON_FONT_FAMILY = 'iconfont';

export const ICON_GLYPHS: Record<string, IconFontGlyph> = {
    leaderboard: { name: '排行榜', unicode: '\ue600', unicodeDecimal: 58880 },
    help: { name: '帮助', unicode: '\ue70f', unicodeDecimal: 59151 },
    refresh: { name: '刷新', unicode: '\ue60e', unicodeDecimal: 58894 },
    share: { name: '分享', unicode: '\ue643', unicodeDecimal: 58947 },
    home: { name: '主页', unicode: '\ue7fe', unicodeDecimal: 59390 },
    close: { name: '关闭', unicode: '\ue6b5', unicodeDecimal: 59061 },
    undo: { name: '撤销', unicode: '\ue603', unicodeDecimal: 58883 },
};

let _iconFontLoaded = false;
let _iconFont: Font | null = null;

export function getIconFont(): Font | null {
    return _iconFont;
}

export function isIconFontLoaded(): boolean {
    return _iconFontLoaded;
}

export function loadIconFont(callback?: () => void): void {
    if (_iconFontLoaded) {
        callback?.();
        return;
    }

    resources.load('font/iconfont', Font, (err, font: Font) => {
        if (err) {
            console.warn('[IconFont] 加载字体失败:', err);
            callback?.();
            return;
        }
        _iconFont = font;
        _iconFontLoaded = true;
        callback?.();
    });
}

/** 与底栏按钮一致的 iconfont 应用逻辑；未加载时先用 fallback 字符保证可见 */
export function applyIconLabel(
    lb: Label,
    iconName: string,
    fontSize: number,
    fallbackChar: string,
): void {
    const font = getIconFont();
    const glyph = ICON_GLYPHS[iconName];
    if (glyph && font) {
        lb.string = glyph.unicode;
        lb.fontSize = fontSize + 16;
        lb.lineHeight = fontSize + 20;
        lb.useSystemFont = false;
        lb.font = font;
    } else if (glyph) {
        lb.string = glyph.unicode;
        lb.fontSize = fontSize + 16;
        lb.lineHeight = fontSize + 20;
        lb.useSystemFont = true;
        lb.font = null;
        lb.fontFamily = ICON_FONT_FAMILY;
    } else {
        lb.string = fallbackChar;
        lb.fontSize = fontSize;
        lb.lineHeight = fontSize + 4;
        applyGlobalLabelFont(lb);
    }
    lb.updateRenderData(true);
}

export function createIconLabel(
    parent: Node,
    layer: number,
    x: number,
    y: number,
    w: number,
    h: number,
    iconName: string,
    fontSize: number = 24,
    color: Color = Color.WHITE,
): Label | null {
    const glyph = ICON_GLYPHS[iconName];
    if (!glyph) {
        console.warn(`[IconFont] 未找到图标: ${iconName}`);
        return null;
    }

    const n = new Node(`Icon_${iconName}`);
    n.parent = parent;
    n.layer = layer;
    n.setPosition(x, y, 0);
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    ut.setAnchorPoint(0.5, 0.5);

    const lb = n.addComponent(Label);
    lb.string = glyph.unicode;
    lb.fontSize = fontSize;
    lb.lineHeight = fontSize;
    lb.color = color;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;

    if (_iconFont) {
        lb.useSystemFont = false;
        lb.font = _iconFont;
    } else {
        lb.fontFamily = ICON_FONT_FAMILY;
    }

    return lb;
}
