import {
    Button,
    Color,
    Graphics,
    Label,
    Node,
    UITransform,
    Widget,
} from 'cc';
import { applyGlobalLabelFont } from '../../core/LabelFont';

export interface GameWinToastOptions {
    toastWidth?: number;
    toastHeight?: number;
    title?: string;
    subTitle?: string;
    retryLabel?: string;
    homeLabel?: string;
    overlayColor?: Color;
    overlayAlpha?: number;
}

const DEFAULT_OVERLAY = new Color(0, 0, 0, 165);
const DEFAULT_TITLE = '恭喜通关！';
const DEFAULT_RETRY_LABEL = '再玩一次';
const DEFAULT_HOME_LABEL = '回到主页';

const PANEL_BG = new Color(255, 248, 232, 255);
const PANEL_BORDER = new Color(196, 154, 108, 255);
const PANEL_SHADOW = new Color(0, 0, 0, 70);
const HEADER_BG = new Color(46, 155, 110, 255);
const HEADER_SHINE = new Color(72, 184, 132, 255);
const TITLE_COLOR = Color.WHITE;
const SUBTITLE_COLOR = new Color(107, 83, 68, 255);
const ACCENT_GOLD = new Color(255, 189, 64, 255);
const RETRY_BG = new Color(46, 155, 110, 255);
const RETRY_TEXT = Color.WHITE;
const HOME_BG = new Color(255, 244, 224, 255);
const HOME_BORDER = new Color(196, 154, 108, 255);
const HOME_TEXT = new Color(139, 90, 43, 255);
const CLOSE_BG = new Color(220, 72, 72, 255);

export class GameWinToast {
    private static _activeToast: Node | null = null;

    public static dismiss(): void {
        if (this._activeToast?.isValid) {
            this._activeToast.destroy();
        }
        this._activeToast = null;
    }

    public static show(
        parent: Node,
        onRetry: () => void,
        onHome: () => void,
        options?: GameWinToastOptions,
    ): void {
        if (this._activeToast?.isValid) {
            return;
        }

        const pageUt = parent.getComponent(UITransform);
        const cw = pageUt?.width ?? parent.parent?.getComponent(UITransform)?.width ?? 720;
        const ch = pageUt?.height ?? parent.parent?.getComponent(UITransform)?.height ?? 1280;

        const panelW = options?.toastWidth ?? Math.min(cw - 56, 580);
        const panelH = options?.toastHeight ?? Math.min(Math.max(ch * 0.34, 300), 380);
        const headerH = 72;
        const title = options?.title ?? DEFAULT_TITLE;
        const subTitle = options?.subTitle ?? '';
        const retryLabel = options?.retryLabel ?? DEFAULT_RETRY_LABEL;
        const homeLabel = options?.homeLabel ?? DEFAULT_HOME_LABEL;

        const overlay = new Node('GameWinToast');
        overlay.parent = parent;
        overlay.layer = parent.layer;
        this._activeToast = overlay;

        const oUt = overlay.addComponent(UITransform);
        oUt.setContentSize(cw, ch);
        oUt.setAnchorPoint(0.5, 0.5);
        overlay.setPosition(0, 0, 0);

        const oW = overlay.addComponent(Widget);
        oW.isAlignTop = true;
        oW.isAlignBottom = true;
        oW.isAlignLeft = true;
        oW.isAlignRight = true;
        oW.top = 0;
        oW.bottom = 0;
        oW.left = 0;
        oW.right = 0;
        oW.alignMode = 2;

        const overlayColor = options?.overlayColor ?? DEFAULT_OVERLAY;
        const overlayAlpha = options?.overlayAlpha ?? 165;
        const oG = overlay.addComponent(Graphics);
        oG.fillColor = new Color(overlayColor.r, overlayColor.g, overlayColor.b, overlayAlpha);
        oG.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        oG.fill();

        overlay.on(Node.EventType.TOUCH_START, (e: { propagationStopped?: boolean }) => {
            e.propagationStopped = true;
        });

        const stack = new Node('WinStack');
        stack.parent = overlay;
        stack.layer = parent.layer;
        stack.setPosition(0, 16, 0);
        const stackUt = stack.addComponent(UITransform);
        stackUt.setContentSize(panelW, panelH + 56);
        stackUt.setAnchorPoint(0.5, 0.5);

        const shadow = new Node('WinShadow');
        shadow.parent = stack;
        shadow.layer = parent.layer;
        shadow.setPosition(0, 8, 0);
        const shadowUt = shadow.addComponent(UITransform);
        shadowUt.setContentSize(panelW, panelH);
        shadowUt.setAnchorPoint(0.5, 0.5);
        const shadowG = shadow.addComponent(Graphics);
        GameWinToast.drawRoundRect(shadowG, -panelW * 0.5, -panelH * 0.5, panelW, panelH, 22, PANEL_SHADOW, null);

        const panel = new Node('WinPanel');
        panel.parent = stack;
        panel.layer = parent.layer;
        panel.setPosition(0, 20, 0);
        const pUt = panel.addComponent(UITransform);
        pUt.setContentSize(panelW, panelH);
        pUt.setAnchorPoint(0.5, 0.5);

        const panelG = panel.addComponent(Graphics);
        GameWinToast.drawRoundRect(panelG, -panelW * 0.5, -panelH * 0.5, panelW, panelH, 22, PANEL_BG, PANEL_BORDER);

        GameWinToast.drawHeader(panel, panelW, panelH, headerH);

        const titleNode = new Node('Title');
        titleNode.parent = panel;
        titleNode.layer = panel.layer;
        titleNode.setPosition(0, panelH * 0.5 - headerH * 0.5, 0);
        const titleUt = titleNode.addComponent(UITransform);
        titleUt.setContentSize(panelW - 80, headerH);
        titleUt.setAnchorPoint(0.5, 0.5);
        const titleLb = titleNode.addComponent(Label);
        titleLb.string = title;
        titleLb.fontSize = 32;
        titleLb.lineHeight = 40;
        titleLb.color = TITLE_COLOR;
        titleLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        titleLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(titleLb);

        if (subTitle) {
            const subNode = new Node('SubTitle');
            subNode.parent = panel;
            subNode.layer = panel.layer;
            subNode.setPosition(0, panelH * 0.5 - headerH - 36, 0);
            const subUt = subNode.addComponent(UITransform);
            subUt.setContentSize(panelW - 64, 48);
            subUt.setAnchorPoint(0.5, 0.5);
            const subLb = subNode.addComponent(Label);
            subLb.string = subTitle;
            subLb.fontSize = 24;
            subLb.lineHeight = 32;
            subLb.color = SUBTITLE_COLOR;
            subLb.horizontalAlign = Label.HorizontalAlign.CENTER;
            subLb.verticalAlign = Label.VerticalAlign.CENTER;
            applyGlobalLabelFont(subLb);
        }

        const btnW = Math.min(156, (panelW - 56) * 0.5 - 8);
        const btnH = 50;
        const btnY = -panelH * 0.5 + 48;
        const btnGap = 16;

        GameWinToast.addActionButton(
            panel,
            'RetryBtn',
            -(btnW + btnGap) * 0.5,
            btnY,
            btnW,
            btnH,
            retryLabel,
            RETRY_BG,
            RETRY_TEXT,
            null,
            () => {
                GameWinToast.dismiss();
                onRetry();
            },
        );

        GameWinToast.addActionButton(
            panel,
            'HomeBtn',
            (btnW + btnGap) * 0.5,
            btnY,
            btnW,
            btnH,
            homeLabel,
            HOME_BG,
            HOME_TEXT,
            HOME_BORDER,
            () => {
                GameWinToast.dismiss();
                onHome();
            },
        );

        GameWinToast.addCloseButton(stack, panelH, () => GameWinToast.dismiss());
    }

    private static drawRoundRect(
        g: Graphics,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fill: Color,
        stroke: Color | null,
    ): void {
        g.fillColor = fill;
        g.moveTo(x + r, y);
        g.lineTo(x + w - r, y);
        g.quadraticCurveTo(x + w, y, x + w, y + r);
        g.lineTo(x + w, y + h - r);
        g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        g.lineTo(x + r, y + h);
        g.quadraticCurveTo(x, y + h, x, y + h - r);
        g.lineTo(x, y + r);
        g.quadraticCurveTo(x, y, x + r, y);
        g.close();
        g.fill();

        if (stroke) {
            g.lineWidth = 2.5;
            g.strokeColor = stroke;
            g.moveTo(x + r, y);
            g.lineTo(x + w - r, y);
            g.quadraticCurveTo(x + w, y, x + w, y + r);
            g.lineTo(x + w, y + h - r);
            g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            g.lineTo(x + r, y + h);
            g.quadraticCurveTo(x, y + h, x, y + h - r);
            g.lineTo(x, y + r);
            g.quadraticCurveTo(x, y, x + r, y);
            g.close();
            g.stroke();
        }
    }

    private static drawHeader(panel: Node, panelW: number, panelH: number, headerH: number): void {
        const header = new Node('Header');
        header.parent = panel;
        header.layer = panel.layer;
        header.setPosition(0, panelH * 0.5 - headerH * 0.5, 0);
        const hUt = header.addComponent(UITransform);
        hUt.setContentSize(panelW - 6, headerH);
        hUt.setAnchorPoint(0.5, 0.5);

        const g = header.addComponent(Graphics);
        const w = panelW - 6;
        const h = headerH;
        const x = -w * 0.5;
        const y = -h * 0.5;
        const r = 18;
        const scallop = 8;

        g.fillColor = HEADER_BG;
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.lineTo(x + w, y + h - r);
        g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        g.lineTo(x + r, y + h);
        g.quadraticCurveTo(x, y + h, x, y + h - r);
        g.lineTo(x, y + r);
        g.quadraticCurveTo(x, y, x + r, y);
        g.close();
        g.fill();

        g.fillColor = HEADER_SHINE;
        g.rect(x + 8, y + h - 10, w - 16, 4);
        g.fill();

        g.fillColor = ACCENT_GOLD;
        g.moveTo(x + w * 0.5 - 36, y + h - scallop);
        g.quadraticCurveTo(x + w * 0.5, y + h + scallop * 0.8, x + w * 0.5 + 36, y + h - scallop);
        g.lineTo(x + w * 0.5 - 36, y + h - scallop);
        g.close();
        g.fill();
    }

    private static addCloseButton(stack: Node, panelH: number, onClick: () => void): void {
        const btnSize = 48;
        const closeBtn = new Node('CloseBtn');
        closeBtn.parent = stack;
        closeBtn.layer = stack.layer;
        closeBtn.setPosition(0, -panelH * 0.5 - 4, 0);
        const ut = closeBtn.addComponent(UITransform);
        ut.setContentSize(btnSize, btnSize);
        ut.setAnchorPoint(0.5, 0.5);

        const g = closeBtn.addComponent(Graphics);
        g.fillColor = CLOSE_BG;
        g.circle(0, 0, btnSize * 0.5);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = Color.WHITE;
        g.circle(0, 0, btnSize * 0.5 - 1);
        g.stroke();
        GameWinToast.drawCloseCross(g, Color.WHITE);

        const btn = closeBtn.addComponent(Button);
        btn.transition = Button.Transition.NONE;
        closeBtn.on(Button.EventType.CLICK, onClick, closeBtn);
    }

    private static drawCloseCross(g: Graphics, color: Color): void {
        const arm = 10;
        g.lineWidth = 3;
        g.strokeColor = color;
        g.moveTo(-arm, arm);
        g.lineTo(arm, -arm);
        g.moveTo(-arm, -arm);
        g.lineTo(arm, arm);
        g.stroke();
    }

    private static addActionButton(
        parent: Node,
        name: string,
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        bgColor: Color,
        textColor: Color,
        borderColor: Color | null,
        onClick: () => void,
    ): void {
        const btnNode = new Node(name);
        btnNode.parent = parent;
        btnNode.layer = parent.layer;
        const btnUt = btnNode.addComponent(UITransform);
        btnUt.setContentSize(width, height);
        btnUt.setAnchorPoint(0.5, 0.5);
        btnNode.setPosition(x, y, 0);

        const bg = new Node(`${name}Bg`);
        bg.parent = btnNode;
        bg.layer = btnNode.layer;
        const bgUt = bg.addComponent(UITransform);
        bgUt.setContentSize(width, height);
        bgUt.setAnchorPoint(0.5, 0.5);
        const bgG = bg.addComponent(Graphics);
        const rx = height * 0.5;
        bgG.fillColor = bgColor;
        bgG.roundRect(-width * 0.5, -height * 0.5, width, height, rx);
        bgG.fill();
        if (borderColor) {
            bgG.lineWidth = 2;
            bgG.strokeColor = borderColor;
            bgG.roundRect(-width * 0.5, -height * 0.5, width, height, rx);
            bgG.stroke();
        }

        const lbNode = new Node(`${name}Label`);
        lbNode.parent = btnNode;
        lbNode.layer = btnNode.layer;
        const lbUt = lbNode.addComponent(UITransform);
        lbUt.setContentSize(width - 12, height);
        lbUt.setAnchorPoint(0.5, 0.5);
        const lb = lbNode.addComponent(Label);
        lb.string = label;
        lb.fontSize = 20;
        lb.lineHeight = 26;
        lb.color = textColor;
        lb.horizontalAlign = Label.HorizontalAlign.CENTER;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        lb.overflow = Label.Overflow.SHRINK;
        applyGlobalLabelFont(lb);

        const btn = btnNode.addComponent(Button);
        btn.transition = Button.Transition.NONE;
        btnNode.on(Button.EventType.CLICK, onClick, btnNode);
    }
}
