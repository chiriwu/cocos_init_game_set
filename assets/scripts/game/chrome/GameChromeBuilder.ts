import { Button, Graphics, Label, Node, UITransform, Widget, Color, director } from 'cc';
import { getIconFont, ICON_GLYPHS } from '../../core/IconFont';
import { shareGame } from '../../core/GameShare';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import {
    GAME_CHROME_AD_BG,
    GAME_CHROME_LINE,
    GAME_CHROME_MUTED,
    GAME_CHROME_ON_PRIMARY,
    GAME_CHROME_PRIMARY,
} from './GameChromePalette';
import { GAME_CHROME_PALETTE } from './GameChromeConfig';
import { GAME_CHROME_BUTTON } from './GameChromeConfig';
import { GAME_CHROME_AD_STRIP_DEFAULT_H, getAdStripHeight } from './GameChromeLayout';
import { GAME_CHROME_AD_ENABLED } from './GameChromeConfig';
import type { GameChromeActionDef, GameChromeIconLabelRef, GameChromeSlot } from './GameChromeTypes';

/** 预定义的常用按钮配置（可直接使用） */
export const GAME_CHROME_SLOTS = {
    /** 返回大厅按钮（home 图标） */
    home: (onClick?: () => void): GameChromeActionDef => ({
        fallbackChar: '家',
        iconName: 'home',
        onClick: onClick ?? (() => director.loadScene('Lobby')),
        btnSize: GAME_CHROME_BUTTON.SIZE_LARGE,
        fontSize: GAME_CHROME_BUTTON.FONT_SIZE_LARGE,
    }),
    
    /** 刷新/重试按钮（refresh 图标） */
    refresh: (onClick: () => void): GameChromeActionDef => ({
        fallbackChar: '刷',
        iconName: 'refresh',
        onClick,
        btnSize: GAME_CHROME_BUTTON.SIZE_LARGE,
        fontSize: GAME_CHROME_BUTTON.FONT_SIZE_LARGE,
    }),
    
    /** 分享按钮（share 图标），分享后可从链接直接进入对应游戏 */
    share: (gameId: string, onClick?: () => void): GameChromeActionDef => ({
        fallbackChar: '分',
        iconName: 'share',
        onClick: onClick ?? (() => shareGame(gameId)),
        btnSize: GAME_CHROME_BUTTON.SIZE_LARGE,
        fontSize: GAME_CHROME_BUTTON.FONT_SIZE_LARGE,
    }),
    
    /** 排行榜按钮（leaderboard 图标） */
    leaderboard: (onClick: () => void): GameChromeActionDef => ({
        fallbackChar: '榜',
        iconName: 'leaderboard',
        onClick,
        btnSize: GAME_CHROME_BUTTON.SIZE_LARGE,
        fontSize: GAME_CHROME_BUTTON.FONT_SIZE_LARGE,
    }),
    
    /** 帮助按钮（help 图标） */
    help: (onClick: () => void): GameChromeActionDef => ({
        fallbackChar: '?',
        iconName: 'help',
        onClick,
        btnSize: GAME_CHROME_BUTTON.SIZE_LARGE,
        fontSize: GAME_CHROME_BUTTON.FONT_SIZE_LARGE,
    }),
    
    /** 撤销按钮（undo 图标） */
    undo: (onClick: () => void): GameChromeActionDef => ({
        fallbackChar: '撤',
        iconName: 'undo',
        onClick,
        btnSize: GAME_CHROME_BUTTON.SIZE_LARGE,
        fontSize: GAME_CHROME_BUTTON.FONT_SIZE_LARGE,
    }),
    
    /** 间距占位符 */
    gap: 'gap' as const,
};

/**
 * 底部全宽广告占位（Widget 贴底，默认高度 120px）
 * 全局开关 GAME_CHROME_AD_ENABLED=false 时返回高度 0 的空节点，不绘制任何内容
 */
export function buildGameChromeAdStrip(
    parent: Node,
    layer: number,
    opts: { cw: number; stripHeight?: number; label?: string },
): Node {
    const stripH = opts.stripHeight ?? getAdStripHeight();
    const n = new Node('GameChromeAdStrip');
    n.parent = parent;
    n.layer = layer;
    const ut = n.addComponent(UITransform);
    if (!GAME_CHROME_AD_ENABLED) {
        ut.setContentSize(opts.cw, 0);
        const w = n.addComponent(Widget);
        w.isAlignBottom = true;
        w.isAlignLeft = true;
        w.isAlignRight = true;
        w.bottom = 0;
        w.left = 0;
        w.right = 0;
        w.alignMode = 2;
        return n;
    }
    ut.setContentSize(opts.cw, stripH);
    ut.setAnchorPoint(0.5, 0);
    const w = n.addComponent(Widget);
    w.isAlignBottom = true;
    w.isAlignLeft = true;
    w.isAlignRight = true;
    w.bottom = 0;
    w.left = 0;
    w.right = 0;
    w.alignMode = 2;
    const g = n.addComponent(Graphics);
    g.fillColor = GAME_CHROME_AD_BG;
    g.rect(-opts.cw * 0.5, 0, opts.cw, stripH);
    g.fill();
    
    const labelNode = new Node('Label');
    labelNode.parent = n;
    labelNode.layer = layer;
    const labelUt = labelNode.addComponent(UITransform);
    labelUt.setContentSize(opts.cw, stripH);
    labelUt.setAnchorPoint(0.5, 0.5);
    labelNode.setPosition(0, stripH * 0.5, 0);
    
    const lb = labelNode.addComponent(Label);
    lb.string = opts.label ?? '广告';
    lb.fontSize = 14;
    lb.lineHeight = 20;
    lb.color = GAME_CHROME_MUTED;
    lb.horizontalAlign = Label.HorizontalAlign.CENTER;
    lb.verticalAlign = Label.VerticalAlign.CENTER;
    applyGlobalLabelFont(lb);
    return n;
}

/** 底栏圆形操作按钮行（等分槽位，支持 `gap`） */
export function buildGameChromeActionBar(
    parent: Node,
    layer: number,
    opts: {
        cw: number;
        centerY: number;
        areaWidthMargin?: number;
        slots: GameChromeSlot[];
    },
): GameChromeIconLabelRef[] {
    const margin = opts.areaWidthMargin ?? 40;
    const areaW = opts.cw - margin;
    const spacing = areaW / (opts.slots.length + 1);
    const refs: GameChromeIconLabelRef[] = [];
    let idx = 1;
    for (const slot of opts.slots) {
        if (slot === 'gap') {
            idx += 1;
            continue;
        }
        const x = -areaW * 0.5 + spacing * idx;
        idx += 1;
        refs.push(...addRoundIconButton(parent, layer, x, opts.centerY, slot));
    }
    return refs;
}

function addRoundIconButton(
    parent: Node,
    layer: number,
    x: number,
    y: number,
    def: GameChromeActionDef,
): GameChromeIconLabelRef[] {
    const btnSize = def.btnSize ?? 46;
    const fontSize = def.fontSize ?? 18;
    const n = new Node(`ChromeHud_${def.fallbackChar}`);
    n.parent = parent;
    n.layer = layer;
    n.setPosition(x, y, 0);
    const ut = n.addComponent(UITransform);
    ut.setContentSize(btnSize, btnSize);
    const g = n.addComponent(Graphics);
    const radius = btnSize * 0.5 - 2;
    g.fillColor = GAME_CHROME_PALETTE.PRIMARY_BLUE;
    g.circle(0, 0, radius);
    g.fill();
    g.lineWidth = 1;
    g.strokeColor = GAME_CHROME_LINE;
    g.circle(0, 0, radius);
    g.stroke();

    const t = new Node('Txt');
    t.parent = n;
    t.layer = layer;
    t.addComponent(UITransform).setContentSize(btnSize, btnSize);
    t.setPosition(0, 0, 0);
    const tLb = t.addComponent(Label);
    applyOneIconLabel(tLb, def.iconName, fontSize, def.fallbackChar);
    tLb.color = GAME_CHROME_ON_PRIMARY;
    tLb.horizontalAlign = Label.HorizontalAlign.CENTER;
    tLb.verticalAlign = Label.VerticalAlign.CENTER;

    const btn = n.addComponent(Button);
    btn.transition = Button.Transition.NONE;
    if (def.clickTarget !== undefined) {
        n.on(Button.EventType.CLICK, def.onClick, def.clickTarget);
    } else {
        n.on(Button.EventType.CLICK, def.onClick);
    }

    return [{ lb: tLb, iconName: def.iconName, fontSize, char: def.fallbackChar }];
}

function applyOneIconLabel(lb: Label, iconName: string | undefined, fontSize: number, char: string): void {
    const font = getIconFont();
    const glyph = iconName && ICON_GLYPHS[iconName] ? ICON_GLYPHS[iconName] : undefined;
    if (glyph && font) {
        lb.string = glyph.unicode;
        lb.fontSize = fontSize + 16;
        lb.lineHeight = fontSize + 20;
        lb.useSystemFont = false;
        lb.font = font;
    } else {
        lb.string = char;
        lb.fontSize = fontSize;
        lb.lineHeight = fontSize + 4;
        applyGlobalLabelFont(lb);
    }
}

/** 在 loadIconFont 回调中调用，刷新底栏图标 */
export function refreshGameChromeIconLabels(refs: GameChromeIconLabelRef[]): void {
    const font = getIconFont();
    for (const ref of refs) {
        const glyph = ref.iconName && ICON_GLYPHS[ref.iconName] ? ICON_GLYPHS[ref.iconName] : undefined;
        if (glyph && font) {
            ref.lb.string = glyph.unicode;
            ref.lb.fontSize = ref.fontSize + 16;
            ref.lb.lineHeight = ref.fontSize + 20;
            ref.lb.useSystemFont = false;
            ref.lb.font = font;
        } else {
            ref.lb.string = ref.char;
            ref.lb.fontSize = ref.fontSize;
            ref.lb.lineHeight = ref.fontSize + 4;
            applyGlobalLabelFont(ref.lb);
        }
    }
}
