import {
    _decorator,
    Button,
    Color,
    Component,
    Graphics,
    Label,
    Node,
    UITransform,
    Widget,
} from 'cc';
import { loadIconFont } from '../../core/IconFont';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import {
    buildGameChromeActionBar,
    buildGameChromeAdStrip,
    GAME_CHROME_SLOTS,
    refreshGameChromeIconLabels,
} from '../../game/chrome/GameChromeBuilder';
import { GAME_CHROME_PALETTE } from '../../game/chrome/GameChromeConfig';
import { GAME_CHROME_ACTION_ROW_DEFAULT_H, getAdStripHeight, getBottomActionBarCenterY } from '../../game/chrome/GameChromeLayout';
import { GameHelpDialog } from '../../game/chrome/GameHelpDialog';
import type { HelpDialogLine, HelpDialogOptions } from '../../game/chrome/GameHelpDialog';
import { LeaderboardPopup } from '../../game/chrome/LeaderboardPopup';

const { ccclass } = _decorator;

export const PAPER = new Color(247, 245, 240, 255);
export const TITLE_INK = new Color(35, 44, 48, 255);
export const BODY = new Color(80, 90, 95, 255);
export const PRIMARY = new Color(90, 114, 123, 255);
export const ON_PRIMARY = new Color(247, 245, 240, 255);
export const MUTED = new Color(137, 150, 156, 255);
export const TILE_BG = new Color(210, 180, 140, 255);
export const TILE_TEXT = new Color(100, 50, 20, 255);
export const EMPTY_BG = new Color(60, 40, 30, 255);

export const NAV_BAR_H = 56;

const CHIP_CREAM = new Color(255, 251, 242, 255);
const CHIP_BORDER = new Color(184, 137, 90, 255);
const CHIP_TEXT = new Color(61, 48, 40, 255);
const CHIP_ACCENT = new Color(139, 90, 43, 255);
const CHIP_ACCENT_DARK = new Color(107, 68, 35, 255);
const CHIP_ON_ACCENT = new Color(255, 248, 232, 255);

export const SUNKEN_INSET_SHADOW = {
    darkOffset: 3,
    darkBlur: 6,
    darkAlpha: 0.35,
    lightOffset: -3,
    lightBlur: 6,
    lightAlpha: 0.15,
    base: new Color(118, 122, 127, 255),
};

export const PRIMARY_ACTION_BTN_W = 168;
export const PRIMARY_ACTION_BTN_H = 50;
export const PRIMARY_ACTION_FONT = 23;

export const BOARD_H_INSET = 24;
export const BOARD_TOP_HEADER_GAP = 56;
export const GAP_BOARD_TO_PRIMARY = 18;
export const GAP_PRIMARY_TO_ICON_ROW = 20;

@ccclass('KlotskiPageBuilder')
export class KlotskiPageBuilder extends Component {
    public buildWrap(root: Node, cw: number, ch: number): Node {
        const wrap = new Node('KlotskiRoot');
        wrap.parent = root;
        wrap.layer = root.layer;
        const wUt = wrap.addComponent(UITransform);
        wUt.setContentSize(cw, ch);
        wUt.setAnchorPoint(0.5, 0.5);
        wrap.setPosition(0, 0, 0);
        const wW = wrap.addComponent(Widget);
        wW.isAlignTop = true;
        wW.isAlignBottom = true;
        wW.isAlignLeft = true;
        wW.isAlignRight = true;
        wW.top = 0;
        wW.bottom = 0;
        wW.left = 0;
        wW.right = 0;
        wW.alignMode = 2;
        const wG = wrap.addComponent(Graphics);
        wG.fillColor = PAPER;
        wG.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        wG.fill();

        return wrap;
    }

    public buildPageNode(parent: Node, name: string, cw: number, ch: number, bgColor: Color = GAME_CHROME_PALETTE.BOARD_BG): Node {
        const page = new Node(name);
        page.parent = parent;
        page.layer = parent.layer;
        const pUt = page.addComponent(UITransform);
        pUt.setContentSize(cw, ch);
        pUt.setAnchorPoint(0.5, 0.5);
        const pG = page.addComponent(Graphics);
        pG.fillColor = bgColor;
        pG.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        pG.fill();
        return page;
    }

    public computePlayLayout(cw: number, ch: number): { boardSize: number; boardY: number; primaryBtnY: number } {
        const hh = ch * 0.5;
        const contentTop = hh - NAV_BAR_H - 12;
        const boardTopY = contentTop - BOARD_TOP_HEADER_GAP;

        const adH = getAdStripHeight();
        const rowH = GAME_CHROME_ACTION_ROW_DEFAULT_H;
        const iconBarCenterY = -hh + adH + rowH * 0.5 + 10;
        const iconBarTopY = iconBarCenterY + rowH * 0.5;

        const primaryBtnY = iconBarTopY + GAP_PRIMARY_TO_ICON_ROW + PRIMARY_ACTION_BTN_H * 0.5;
        const boardBandBottom = primaryBtnY + PRIMARY_ACTION_BTN_H * 0.5 + GAP_BOARD_TO_PRIMARY;

        const bandHeight = Math.max(0, boardTopY - boardBandBottom);
        const boardSize = Math.min(bandHeight, Math.max(0, cw - BOARD_H_INSET * 2));
        const boardY = boardBandBottom + bandHeight * 0.5;

        return { boardSize, boardY, primaryBtnY };
    }

    public addLabel(parent: Node, name: string, y: number, w: number, h: number, text: string, fontSize: number, lineHeight: number, color: Color, hAlign: number, x = 0): Label {
        const n = new Node(name);
        n.parent = parent;
        n.layer = parent.layer;
        n.setPosition(x, y, 0);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(w, h);
        ut.setAnchorPoint(0.5, 0.5);
        const lb = n.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.lineHeight = lineHeight;
        lb.color = color;
        lb.horizontalAlign = hAlign;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(lb);
        return lb;
    }

    public addLabelWithSunkenBg(parent: Node, name: string, y: number, w: number, h: number, text: string, fontSize: number, lineHeight: number, color: Color, hAlign: number, x = 0): Label {
        const chipW = Math.max(w, 128);
        const chipH = Math.max(h, 40);

        const bg = new Node(`${name}_Bg`);
        bg.parent = parent;
        bg.layer = parent.layer;
        bg.setPosition(x, y, 0);
        const bgUt = bg.addComponent(UITransform);
        bgUt.setContentSize(chipW, chipH);
        bgUt.setAnchorPoint(0.5, 0.5);

        const shadow = new Node(`${name}_Shadow`);
        shadow.parent = bg;
        shadow.layer = parent.layer;
        shadow.setPosition(0, -2, 0);
        shadow.addComponent(UITransform).setContentSize(chipW, chipH);
        const shadowG = shadow.addComponent(Graphics);
        KlotskiPageBuilder.drawPill(shadowG, chipW, chipH, new Color(0, 0, 0, 35), null, 0);

        const face = new Node(`${name}_Face`);
        face.parent = bg;
        face.layer = parent.layer;
        face.addComponent(UITransform).setContentSize(chipW, chipH);
        const faceG = face.addComponent(Graphics);
        KlotskiPageBuilder.drawPill(faceG, chipW, chipH, CHIP_CREAM, CHIP_BORDER, 2);

        const icon = new Node(`${name}_Icon`);
        icon.parent = bg;
        icon.layer = parent.layer;
        icon.setPosition(-chipW * 0.5 + 22, 0, 0);
        const iconUt = icon.addComponent(UITransform);
        iconUt.setContentSize(24, 24);
        iconUt.setAnchorPoint(0.5, 0.5);
        const iconG = icon.addComponent(Graphics);
        iconG.lineWidth = 2;
        iconG.strokeColor = CHIP_ACCENT;
        iconG.circle(0, 0, 8);
        iconG.stroke();
        iconG.moveTo(0, 0);
        iconG.lineTo(0, -5);
        iconG.stroke();
        iconG.moveTo(0, 0);
        iconG.lineTo(4, 2);
        iconG.stroke();

        const n = new Node(name);
        n.parent = bg;
        n.layer = parent.layer;
        n.setPosition(8, 0, 0);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(chipW - 36, chipH);
        ut.setAnchorPoint(0.5, 0.5);
        const lb = n.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.lineHeight = lineHeight;
        lb.color = CHIP_TEXT;
        lb.horizontalAlign = hAlign;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(lb);
        return lb;
    }

    public buildSizeSelectorChip(
        parent: Node,
        layer: number,
        x: number,
        y: number,
        text: string,
        onClick: () => void,
    ): Label {
        const chipW = 128;
        const chipH = 40;

        const sizeBtn = new Node('SizeBtn');
        sizeBtn.parent = parent;
        sizeBtn.layer = layer;
        const sbUt = sizeBtn.addComponent(UITransform);
        sbUt.setContentSize(chipW, chipH);
        sbUt.setAnchorPoint(0.5, 0.5);
        sizeBtn.setPosition(x, y, 0);

        const shadow = new Node('SizeShadow');
        shadow.parent = sizeBtn;
        shadow.layer = layer;
        shadow.setPosition(0, -2, 0);
        shadow.addComponent(UITransform).setContentSize(chipW, chipH);
        const shadowG = shadow.addComponent(Graphics);
        KlotskiPageBuilder.drawPill(shadowG, chipW, chipH, new Color(0, 0, 0, 45), null, 0);

        const face = new Node('SizeFace');
        face.parent = sizeBtn;
        face.layer = layer;
        face.addComponent(UITransform).setContentSize(chipW, chipH);
        const faceG = face.addComponent(Graphics);
        KlotskiPageBuilder.drawPill(faceG, chipW, chipH, CHIP_ACCENT, CHIP_ACCENT_DARK, 2);
        faceG.fillColor = new Color(255, 255, 255, 40);
        faceG.roundRect(-chipW * 0.5 + 4, chipH * 0.5 - 14, chipW - 8, 8, 4);
        faceG.fill();

        const txt = new Node('Txt');
        txt.parent = sizeBtn;
        txt.layer = layer;
        const txtUt = txt.addComponent(UITransform);
        txtUt.setContentSize(chipW - 12, chipH);
        txtUt.setAnchorPoint(0.5, 0.5);
        const sbLb = txt.addComponent(Label);
        sbLb.string = text;
        sbLb.fontSize = 20;
        sbLb.lineHeight = 26;
        sbLb.color = CHIP_ON_ACCENT;
        sbLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        sbLb.verticalAlign = Label.VerticalAlign.CENTER;
        sbLb.overflow = Label.Overflow.NONE;
        applyGlobalLabelFont(sbLb);

        const sbBtn = sizeBtn.addComponent(Button);
        sbBtn.transition = Button.Transition.NONE;
        sizeBtn.on(Button.EventType.CLICK, onClick, sizeBtn);
        return sbLb;
    }

    protected static drawPill(
        g: Graphics,
        w: number,
        h: number,
        fill: Color,
        stroke: Color | null,
        lineWidth: number,
    ): void {
        const r = h * 0.5;
        g.fillColor = fill;
        g.roundRect(-w * 0.5, -h * 0.5, w, h, r);
        g.fill();
        if (stroke && lineWidth > 0) {
            g.lineWidth = lineWidth;
            g.strokeColor = stroke;
            g.roundRect(-w * 0.5, -h * 0.5, w, h, r);
            g.stroke();
        }
    }

    public addRoundBtn(parent: Node, layer: number, x: number, y: number, text: string, w: number, h: number, fontSize: number, onClick: () => void): Node {
        const n = new Node(`Btn_${text}`);
        n.parent = parent;
        n.layer = layer;
        n.setPosition(x, y, 0);
        const ut = n.addComponent(UITransform);
        ut.setContentSize(w, h);
        ut.setAnchorPoint(0.5, 0.5);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(139, 90, 43, 255);
        g.roundRect(-w * 0.5, -h * 0.5, w, h, 12);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = new Color(100, 60, 20, 255);
        g.roundRect(-w * 0.5, -h * 0.5, w, h, 12);
        g.stroke();
        const txt = new Node('Txt');
        txt.parent = n;
        txt.layer = layer;
        txt.addComponent(UITransform).setContentSize(w, h);
        const lb = txt.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.lineHeight = fontSize + 6;
        lb.color = new Color(255, 240, 200, 255);
        lb.horizontalAlign = Label.HorizontalAlign.CENTER;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        lb.overflow = Label.Overflow.NONE;
        applyGlobalLabelFont(lb);
        const btn = n.addComponent(Button);
        btn.transition = Button.Transition.NONE;
        n.on(Button.EventType.CLICK, onClick, this);
        return n;
    }

    public mountBottomChrome(parent: Node, layer: number, cw: number, ch: number, onHelp?: () => void): void {
        buildGameChromeAdStrip(parent, layer, { cw, label: '广告位' });
        const bottomBtnY = getBottomActionBarCenterY(ch);
        const refs = buildGameChromeActionBar(parent, layer, {
            cw,
            centerY: bottomBtnY,
            slots: [
                GAME_CHROME_SLOTS.home(),
                GAME_CHROME_SLOTS.leaderboard(() => LeaderboardPopup.show(parent)),
                GAME_CHROME_SLOTS.help(onHelp || (() => console.log('help'))),
                GAME_CHROME_SLOTS.share('klotski'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    public showHelpDialog(
        parent: Node,
        title: string,
        lines: HelpDialogLine[],
        options?: HelpDialogOptions
    ): void {
        GameHelpDialog.show(parent, title, lines, options);
    }
}