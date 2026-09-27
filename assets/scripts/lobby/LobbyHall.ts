import {
    _decorator,
    Button,
    Color,
    Component,
    Graphics,
    Label,
    Layout,
    Mask,
    Node,
    resources,
    ScrollView,
    Size,
    Sprite,
    SpriteFrame,
    Texture2D,
    UITransform,
    Vec2,
    Widget,
} from 'cc';

/** resources 下路径，不含扩展名；贴图类型需加载 /texture 子资源 */
const LOBBY_BG_TEXTURE = 'textures/lobby_bg/texture';

function resourcesTexturePath(basePath: string): string {
    return `${basePath}/texture`;
}
import { GameRouter } from '../core/GameRouter';
import { ALL_GAME_SET } from './LobbyData';
import { initGlobalAssets } from '../core/GlobalAssetsConfig';
import { applyGlobalLabelFont } from '../core/LabelFont';

const { ccclass } = _decorator;

/**
 * 会话内记忆大厅纵向滚动比例：getScrollOffset().y / getMaxScrollOffset().y
 * （0=顶部，1=底部）。须用 scrollToOffset 恢复，不能用 scrollToPercentVertical（二者 Y 轴语义相反）。
 */
let lobbyScrollRatioY = 0;
let lobbyScrollSaved = false;

/**
 * 项目配色规范
 * 主色 #5A727B · 辅色1 宣纸白 #F7F5F0 · 辅色2 线 #CBD5D9 · 强调 #A83232
 * 标题 #232C30 · 正文 #505A5F · 置灰 #89969C
 */
const PALETTE = {
    /** 主色：导航、主按钮区、模块标题底 */
    primary: new Color(90, 114, 123, 255),
    /** 辅色1：页面底、大面积留白（整页纯色背景） */
    paper: new Color(247, 245, 240, 255),
    /** 辅色2：分割线、浅线 */
    line: new Color(203, 213, 217, 255),
    lineFaint: new Color(203, 213, 217, 90),
    /** 强调：印标、角标、重点 */
    accent: new Color(168, 50, 50, 255),
    accentSoft: new Color(168, 50, 50, 70),
    /** 字阶（墨系） */
    titleText: new Color(35, 44, 48, 255),
    bodyText: new Color(80, 90, 95, 255),
    mutedText: new Color(137, 150, 156, 255),
    /** 导航栏上的反色字（宣纸白） */
    onPrimaryText: new Color(247, 245, 240, 255),
    /** 卡片 */
    cardPaper: new Color(255, 254, 252, 255),
    cardFaceLo: new Color(248, 246, 242, 255),
    cardWell: new Color(242, 245, 246, 255),
    cardShadow: new Color(35, 44, 48, 26),
    cardBorder: new Color(203, 213, 217, 240),
    cardBorderSoft: new Color(203, 213, 217, 110),
    /** 图标区描边 */
    iconMatRing: new Color(203, 213, 217, 220),
};

/** HSV(0~1) → RGB */
function hsvToColor(h: number, s: number, v: number, a = 255): Color {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0;
    let g = 0;
    let b = 0;
    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        default:
            r = v;
            g = p;
            b = q;
            break;
    }
    return new Color(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), a);
}

/** 占位图标色：低饱和、色相围绕主色 #5A727B（青灰）小幅摆动 */
function inkTintFromId(id: string): Color {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    const t = (h >>> 0) % 1000 / 1000;
    const hue = 0.52 + (t - 0.5) * 0.1;
    return hsvToColor(hue % 1, 0.24, 0.52, 255);
}

/** 顶部主色导航栏高度 */
const NAV_BAR_H = 156;

/** 竖向卡片：大图标区 + 底部题名；列数略少更显档次 */
function computeGameGrid(innerWidth: number): { cols: number; cellW: number; cellH: number } {
    const spacing = 18;
    const minCellW = 168;
    const maxCols = 3;
    let cols = Math.min(maxCols, Math.max(1, Math.floor((innerWidth + spacing) / (minCellW + spacing))));
    let cellW = Math.floor((innerWidth - spacing * (cols - 1)) / cols);
    while (cellW < minCellW && cols > 1) {
        cols -= 1;
        cellW = Math.floor((innerWidth - spacing * (cols - 1)) / cols);
    }
    const iconSide = Math.max(96, Math.min(cellW - 26, 128));
    const textBand = 46;
    /** 卡片上下留白 + 与 split 留白，需满足 cellH - 80 >= iconSide + 画心边距 */
    const vPad = 52;
    const cellH = iconSide + textBand + vPad;
    return { cols, cellW, cellH };
}

/** 整页纯色背景（宣纸白 #F7F5F0） */
function drawSolidBackdrop(g: Graphics, cw: number, ch: number): void {
    const hw = cw * 0.5;
    const hh = ch * 0.5;
    g.clear();
    g.fillColor = PALETTE.paper;
    g.rect(-hw, -hh, cw, ch);
    g.fill();
}

/** 游戏卡：画心凹区 + 双线框 + 题名区隔线 + 朱砂点缀（坐标与 cell 锚点居中一致） */
function drawPremiumGameCard(g: Graphics, cellW: number, cellH: number): void {
    const pad = 10;
    const textBand = 46;
    const w = cellW - pad * 2;
    const h = cellH - pad * 2;
    const x = -cellW * 0.5 + pad;
    const y = -cellH * 0.5 + pad;
    const r = 12;
    const innerBottom = y + h;
    const splitY = innerBottom - textBand;
    const wellMargin = 8;
    const wx = x + wellMargin;
    const wy = y + wellMargin;
    const ww = w - wellMargin * 2;
    const wh = Math.max(72, splitY - wy - 6);
    const wr = 10;

    g.clear();

    g.fillColor = PALETTE.cardShadow;
    g.roundRect(x + 2, y - 2, w, h, r);
    g.fill();

    g.fillColor = PALETTE.cardFaceLo;
    g.roundRect(x, y, w, h, r);
    g.fill();

    g.fillColor = PALETTE.cardWell;
    g.roundRect(wx, wy, ww, wh, wr);
    g.fill();

    g.lineWidth = 1;
    g.strokeColor = PALETTE.cardBorderSoft;
    g.roundRect(wx + 0.5, wy + 0.5, ww - 1, wh - 1, wr - 0.5);
    g.stroke();

    g.lineWidth = 1;
    g.strokeColor = PALETTE.cardBorderSoft;
    g.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
    g.stroke();

    g.lineWidth = 1.25;
    g.strokeColor = PALETTE.cardBorder;
    g.roundRect(x + 3, y + 3, w - 6, h - 6, r - 2);
    g.stroke();
}

/** 图标衬底（略提亮，托住大图标） */
function drawIconInkMat(g: Graphics, side: number): void {
    const half = side * 0.5;
    const r = side * 0.14;

    g.clear();
    g.fillColor = PALETTE.cardPaper;
    g.roundRect(-half, -half, side, side, r);
    g.fill();

    g.lineWidth = 1.25;
    g.strokeColor = PALETTE.iconMatRing;
    g.roundRect(-half + 0.5, -half + 0.5, side - 1, side - 1, r - 0.5);
    g.stroke();
}

@ccclass('LobbyHall')
export class LobbyHall extends Component {
    private _scrollView: ScrollView | null = null;

    onLoad(): void {
        if (GameRouter.tryEnterFromDeepLink()) {
            return;
        }

        initGlobalAssets(() => {
            // 未配置图标或图标加载失败时，由 buildAll 内部用 Graphics 绘制彩色圆角矩形兜底
            this.buildAll(null);
        });
    }

    private buildAll(whiteSf: SpriteFrame | null): void {
        const root = this.node;
        const canvas = root.parent;
        if (!canvas) {
            return;
        }

        const canvasTrans = canvas.getComponent(UITransform);
        const cw = canvasTrans ? canvasTrans.width : 1280;
        const ch = canvasTrans ? canvasTrans.height : 720;
        const viewH = ch - NAV_BAR_H;

        /** LobbyRoot 铺满 Canvas，子节点 Widget 的 top/bottom 才与屏幕一致 */
        let rootUt = root.getComponent(UITransform);
        if (!rootUt) {
            rootUt = root.addComponent(UITransform);
        }
        rootUt.setContentSize(cw, ch);
        rootUt.setAnchorPoint(0.5, 0.5);
        let rootWidget = root.getComponent(Widget);
        if (!rootWidget) {
            rootWidget = root.addComponent(Widget);
        }
        rootWidget.isAlignTop = true;
        rootWidget.isAlignBottom = true;
        rootWidget.isAlignLeft = true;
        rootWidget.isAlignRight = true;
        rootWidget.top = 0;
        rootWidget.bottom = 0;
        rootWidget.left = 0;
        rootWidget.right = 0;
        rootWidget.alignMode = 2;
        const contentInnerW = cw - 40;
        const sectionInnerW = cw - 48;
        const { cols: gridCols, cellW, cellH } = computeGameGrid(sectionInnerW);

        const backdrop = new Node('InkBackdrop');
        backdrop.parent = root;
        backdrop.layer = root.layer;
        backdrop.setSiblingIndex(0);
        const bdTrans = backdrop.addComponent(UITransform);
        bdTrans.setContentSize(cw, ch);
        bdTrans.setAnchorPoint(0.5, 0.5);
        backdrop.setPosition(0, 0, 0);
        const bdWidget = backdrop.addComponent(Widget);
        bdWidget.isAlignTop = true;
        bdWidget.isAlignBottom = true;
        bdWidget.isAlignLeft = true;
        bdWidget.isAlignRight = true;
        bdWidget.top = 0;
        bdWidget.bottom = 0;
        bdWidget.left = 0;
        bdWidget.right = 0;
        bdWidget.alignMode = 2;
        
        const bdSprite = backdrop.addComponent(Sprite);
        bdSprite.type = Sprite.Type.SIMPLE;
        bdSprite.sizeMode = Sprite.SizeMode.CUSTOM;

        resources.load(LOBBY_BG_TEXTURE, Texture2D, (err, texture) => {
            if (err || !texture) {
                console.warn('Failed to load lobby background image, using solid color:', err);
                bdSprite.destroy();
                const bdG = backdrop.addComponent(Graphics);
                drawSolidBackdrop(bdG, cw, ch);
                return;
            }
            const sf = new SpriteFrame();
            sf.texture = texture;
            bdSprite.spriteFrame = sf;
        });

        const navBar = new Node('HallNav');
        navBar.parent = root;
        navBar.layer = root.layer;
        const navUt = navBar.addComponent(UITransform);
        navUt.setContentSize(cw, NAV_BAR_H);
        navUt.setAnchorPoint(0.5, 0.5);
        const navWidget = navBar.addComponent(Widget);
        navWidget.isAlignTop = true;
        navWidget.isAlignLeft = true;
        navWidget.isAlignRight = true;
        navWidget.top = 0;
        navWidget.left = 0;
        navWidget.right = 0;
        navWidget.alignMode = 2;
        const navG = navBar.addComponent(Graphics);
        // 与 anchor (0.5,0.5) + contentSize(cw, NAV_BAR_H) 一致：局部 y ∈ [-H/2, H/2]
        const navHalf = NAV_BAR_H * 0.5;
        navG.lineWidth = 1;
        navG.strokeColor = PALETTE.line;
        navG.moveTo(-cw * 0.5, -navHalf);
        navG.lineTo(cw * 0.5, -navHalf);
        navG.stroke();
        const navTitle = new Node('NavTitle');
        navTitle.parent = navBar;
        navTitle.layer = root.layer;
        const navTitleUt = navTitle.addComponent(UITransform);
        navTitleUt.setContentSize(cw - 24, NAV_BAR_H);
        navTitleUt.setAnchorPoint(0.5, 0.5);
        navTitle.setPosition(0, 0, 0);
        const navLb = navTitle.addComponent(Label);
        navLb.string = '益智游戏合集';
        navLb.fontSize = 36;
        navLb.lineHeight = 44;
        navLb.color = new Color(0, 0, 0, 255);
        navLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        navLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(navLb);

        const scrollNode = new Node('LobbyScroll');
        scrollNode.parent = root;
        scrollNode.layer = root.layer;
        const scrollTrans = scrollNode.addComponent(UITransform);
        scrollTrans.setContentSize(cw, viewH);
        scrollTrans.setAnchorPoint(0.5, 0.5);

        const scrollWidget = scrollNode.addComponent(Widget);
        scrollWidget.isAlignTop = true;
        scrollWidget.isAlignBottom = true;
        scrollWidget.isAlignLeft = true;
        scrollWidget.isAlignRight = true;
        scrollWidget.top = NAV_BAR_H;
        scrollWidget.bottom = 0;
        scrollWidget.left = 0;
        scrollWidget.right = 0;
        scrollWidget.alignMode = 2;

        const scroll = scrollNode.addComponent(ScrollView);
        scroll.horizontal = false;
        scroll.vertical = true;
        scroll.inertia = true;
        scroll.elastic = true;
        scroll.bounceDuration = 0.23;

        const viewNode = new Node('view');
        viewNode.parent = scrollNode;
        viewNode.layer = root.layer;
        const viewTrans = viewNode.addComponent(UITransform);
        viewTrans.setContentSize(cw, viewH);
        viewTrans.setAnchorPoint(0.5, 0.5);
        viewNode.setPosition(0, 0, 0);
        viewNode.addComponent(Mask);

        const content = new Node('content');
        content.parent = viewNode;
        content.layer = root.layer;
        const contentTrans = content.addComponent(UITransform);
        contentTrans.setAnchorPoint(0.5, 1);
        contentTrans.setContentSize(contentInnerW, 0);
        content.setPosition(0, viewH * 0.5, 0);

        const rootLayout = content.addComponent(Layout);
        rootLayout.type = Layout.Type.VERTICAL;
        rootLayout.resizeMode = Layout.ResizeMode.CONTAINER;
        rootLayout.spacingY = 22;
        rootLayout.paddingTop = 18;
        rootLayout.paddingBottom = 40;
        rootLayout.paddingLeft = 20;
        rootLayout.paddingRight = 20;
        rootLayout.horizontalDirection = Layout.HorizontalDirection.LEFT_TO_RIGHT;
        rootLayout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;

        scroll.content = content;
        this._scrollView = scroll;

        const grid = new Node('GameGrid');
        grid.parent = content;
        grid.layer = root.layer;
        const gridTrans = grid.addComponent(UITransform);
        gridTrans.setContentSize(sectionInnerW, 10);

        const gridLayout = grid.addComponent(Layout);
        gridLayout.type = Layout.Type.GRID;
        gridLayout.resizeMode = Layout.ResizeMode.CONTAINER;
        gridLayout.constraint = Layout.Constraint.FIXED_COL;
        gridLayout.constraintNum = gridCols;
        gridLayout.cellSize = new Size(cellW, cellH);
        gridLayout.spacingX = 16;
        gridLayout.spacingY = 16;
        gridLayout.startAxis = Layout.AxisDirection.HORIZONTAL;
        gridLayout.paddingLeft = 0;
        gridLayout.paddingRight = 0;
        gridLayout.paddingTop = 0;
        gridLayout.paddingBottom = 0;

        for (const game of ALL_GAME_SET) {
            const cell = this.makeGameCell(game.id, game.title, game.iconPath, whiteSf, root.layer, cellW, cellH);
            cell.parent = grid;
        }

        // 顺序：背景 → 顶栏 → 滚动区（滚动在上层，仅占据 top=NAV_BAR_H 以下，不与顶栏重叠）
        backdrop.setSiblingIndex(0);
        navBar.setSiblingIndex(1);
        scrollNode.setSiblingIndex(2);

        if (lobbyScrollSaved) {
            this._tryRestoreScrollPosition(scroll);
        }
    }

    private makeGameCell(
        id: string,
        title: string,
        iconPath: string | undefined,
        defaultSf: SpriteFrame | null,
        layer: number,
        cellW: number,
        cellH: number,
    ): Node {
        const cell = new Node(`Game_${id}`);
        cell.layer = layer;

        const cellTrans = cell.addComponent(UITransform);
        cellTrans.setContentSize(cellW, cellH);

        const cardBg = new Node('GameCard');
        cardBg.parent = cell;
        cardBg.layer = layer;
        cardBg.setSiblingIndex(0);
        const cardUt = cardBg.addComponent(UITransform);
        cardUt.setContentSize(cellW, cellH);
        const cardG = cardBg.addComponent(Graphics);
        drawPremiumGameCard(cardG, cellW, cellH);

        const cardPad = 10;
        const wellMargin = 8;
        const textBand = 46;
        const yTop = -cellH * 0.5 + cardPad;
        const wy = yTop + wellMargin;
        const innerBottom = cellH * 0.5 - cardPad;
        const splitY = innerBottom - textBand;
        const wh = Math.max(72, splitY - wy - 6);
        const iconCenterY = wy + wh * 0.5;

        const innerW = cellW - 2 * cardPad;
        const ww = innerW - 2 * wellMargin;
        const iconSide = Math.max(96, Math.min(ww - 8, 124));

        const matPad = 6;
        const iconMat = new Node('IconMat');
        iconMat.parent = cell;
        iconMat.layer = layer;
        const iconMatUt = iconMat.addComponent(UITransform);
        iconMatUt.setContentSize(iconSide + matPad, iconSide + matPad);
        iconMat.setPosition(0, iconCenterY, 0);
        const iconMatG = iconMat.addComponent(Graphics);
        drawIconInkMat(iconMatG, iconSide + matPad);

        const iconWrap = new Node('Icon');
        iconWrap.parent = cell;
        iconWrap.layer = layer;
        const iconWrapTrans = iconWrap.addComponent(UITransform);
        iconWrapTrans.setContentSize(iconSide, iconSide);
        iconWrap.setPosition(0, iconCenterY, 0);

        const tint = inkTintFromId(id);
        
        const setupSprite = (sf: SpriteFrame, useTint = false) => {
            const sp = iconWrap.addComponent(Sprite);
            sp.spriteFrame = sf;
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            sp.color = useTint ? tint : Color.WHITE;
        };

        if (iconPath) {
            resources.load(resourcesTexturePath(iconPath), Texture2D, (err, texture) => {
                if (err || !texture) {
                    console.warn(`Failed to load icon for ${id}: ${iconPath}`, err);
                    if (defaultSf) {
                        setupSprite(defaultSf, true);
                    } else {
                        const g = iconWrap.addComponent(Graphics);
                        const half = iconSide * 0.5;
                        const ir = Math.min(14, iconSide * 0.16);
                        g.fillColor = tint;
                        g.roundRect(-half, -half, iconSide, iconSide, ir);
                        g.fill();
                    }
                    return;
                }
                const sf = new SpriteFrame();
                sf.texture = texture;
                setupSprite(sf, false);
            });
        } else if (defaultSf) {
            setupSprite(defaultSf, true);
        } else {
            const g = iconWrap.addComponent(Graphics);
            const half = iconSide * 0.5;
            const ir = Math.min(14, iconSide * 0.16);
            g.fillColor = tint;
            g.roundRect(-half, -half, iconSide, iconSide, ir);
            g.fill();
        }

        const nameNode = new Node('Name');
        nameNode.parent = cell;
        nameNode.layer = layer;
        const nameUt = nameNode.addComponent(UITransform);
        nameUt.setContentSize(cellW - 20, textBand - 4);
        nameUt.setAnchorPoint(0.5, 0.5);
        nameNode.setPosition(0, innerBottom - (textBand - 4) * 0.5 - 2, 0);
        const nameLb = nameNode.addComponent(Label);
        nameLb.string = title;
        nameLb.fontSize = 24;
        nameLb.lineHeight = 24;
        nameLb.color = PALETTE.bodyText.clone();
        nameLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        nameLb.verticalAlign = Label.VerticalAlign.CENTER;
        nameLb.overflow = Label.Overflow.SHRINK;
        applyGlobalLabelFont(nameLb);

        const hit = new Node('CellHit');
        hit.parent = cell;
        hit.layer = layer;
        hit.setSiblingIndex(cell.children.length - 1);
        const hitUt = hit.addComponent(UITransform);
        hitUt.setContentSize(cellW, cellH);
        const hitBtn = hit.addComponent(Button);
        hitBtn.transition = Button.Transition.NONE;
        hit.on(Button.EventType.CLICK, () => {
            if (this._scrollView) {
                this._persistScrollPosition(this._scrollView);
            }
            GameRouter.enter(id);
        }, this);

        return cell;
    }

    /** 进游戏前保存纵向滚动比例 */
    private _persistScrollPosition(scroll: ScrollView): void {
        scroll.content?.getComponent(Layout)?.updateLayout();
        const maxY = scroll.getMaxScrollOffset().y;
        lobbyScrollRatioY = maxY > 0 ? scroll.getScrollOffset().y / maxY : 0;
        lobbyScrollSaved = true;
    }

    /**
     * 回到大厅后恢复滚动。
     * 须用 scrollToOffset(ratio * maxY)：与 getScrollOffset 对称；
     * scrollToPercentVertical 的 percent 与 offset/max 在 Y 轴上方向相反，会导致位置偏差。
     */
    private _tryRestoreScrollPosition(scroll: ScrollView): void {
        const ratio = lobbyScrollRatioY;

        const apply = (): void => {
            const maxY = scroll.getMaxScrollOffset().y;
            if (maxY <= 0) {
                return;
            }
            scroll.scrollToOffset(new Vec2(0, ratio * maxY), 0);
        };

        const waitUntilReady = (attempt: number): void => {
            if (scroll.getMaxScrollOffset().y <= 0 && attempt < 20) {
                this.scheduleOnce(() => waitUntilReady(attempt + 1), 0);
                return;
            }
            apply();
        };

        // 首帧 Layout 可能尚未算完 maxOffset
        this.scheduleOnce(() => waitUntilReady(0), 0);
        // ScrollView.start / Widget 对齐会在首帧后再调 _calculateBoundary 回顶，末次覆盖
        this.scheduleOnce(apply, 0.2);
    }
}
