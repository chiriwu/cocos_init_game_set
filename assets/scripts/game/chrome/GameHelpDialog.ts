import {
    Button,
    Color,
    Graphics,
    Label,
    Mask,
    Node,
    ScrollView,
    UITransform,
    Widget,
} from 'cc';
import { applyGlobalLabelFont } from '../../core/LabelFont';

export interface HelpDialogLine {
    text: string;
    fontSize?: number;
    color?: Color;
    lineHeight?: number;
}

export interface HelpDialogOptions {
    /** 弹窗最大高度；内容较少时会自动缩小，较多时在内部滚动 */
    boxWidth?: number;
    boxHeight?: number;
    titleColor?: Color;
    textColor?: Color;
    overlayColor?: Color;
    overlayAlpha?: number;
    boxBgColor?: Color;
    boxBorderColor?: Color;
    closeBtnColor?: Color;
}

/** 与 OneStroke 帮助弹窗一致的默认配色 */
const DEFAULT_TITLE_COLOR = new Color(255, 255, 255, 255);
const DEFAULT_TEXT_COLOR = new Color(220, 220, 220, 255);
const DEFAULT_BOX_BG = new Color(72, 69, 60, 225);
const DEFAULT_BOX_BORDER = new Color(203, 213, 217, 255);
const DEFAULT_BTN_BG = new Color(90, 114, 123, 255);
const DEFAULT_OVERLAY = new Color(0, 0, 0, 150);

const TITLE_H = 56;
const TITLE_TOP_PAD = 8;
const CONTENT_PAD = 20;
const LINE_GAP = 6;
const MIN_BOX_H = 180;

export class GameHelpDialog {
    private static _activeDialog: Node | null = null;

    public static dismiss(): void {
        if (this._activeDialog?.isValid) {
            this._activeDialog.destroy();
        }
        this._activeDialog = null;
    }

    public static show(
        parent: Node,
        title: string,
        lines: HelpDialogLine[],
        options?: HelpDialogOptions,
    ): void {
        if (this._activeDialog?.isValid) {
            return;
        }

        const pageUt = parent.getComponent(UITransform);
        const cw = pageUt?.width ?? parent.parent?.getComponent(UITransform)?.width ?? 720;
        const ch = pageUt?.height ?? parent.parent?.getComponent(UITransform)?.height ?? 1280;

        const dialog = new Node('GameHelpDialog');
        dialog.parent = parent;
        dialog.layer = parent.layer;
        this._activeDialog = dialog;

        const oUt = dialog.addComponent(UITransform);
        oUt.setContentSize(cw, ch);
        oUt.setAnchorPoint(0.5, 0.5);
        dialog.setPosition(0, 0, 0);

        const oW = dialog.addComponent(Widget);
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
        const overlayAlpha = options?.overlayAlpha ?? 150;
        const oG = dialog.addComponent(Graphics);
        oG.fillColor = new Color(overlayColor.r, overlayColor.g, overlayColor.b, overlayAlpha);
        oG.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        oG.fill();

        dialog.on(Node.EventType.TOUCH_START, (e: { propagationStopped?: boolean }) => {
            e.propagationStopped = true;
        });

        const closeOnClick = () => {
            GameHelpDialog.dismiss();
        };

        const boxW = options?.boxWidth ?? Math.min(cw - 60, 500);
        const maxBoxH = options?.boxHeight ?? Math.min(ch * 0.72, 560);
        const listW = boxW - 40;
        const defaultFontSize = 18;
        const defaultColor = options?.textColor ?? DEFAULT_TEXT_COLOR;
        const defaultLineHeight = 28;

        const measured = GameHelpDialog.measureLines(
            dialog,
            lines,
            listW,
            defaultFontSize,
            defaultLineHeight,
        );
        const maxContentH = maxBoxH - TITLE_H - TITLE_TOP_PAD - CONTENT_PAD * 2;
        const needsScroll = measured.totalH > maxContentH;
        const contentViewH = needsScroll ? maxContentH : measured.totalH;
        const boxH = Math.max(
            MIN_BOX_H,
            TITLE_H + TITLE_TOP_PAD + CONTENT_PAD * 2 + contentViewH,
        );

        const box = new Node('HelpBox');
        box.parent = dialog;
        box.layer = parent.layer;
        const bUt = box.addComponent(UITransform);
        bUt.setContentSize(boxW, boxH);
        bUt.setAnchorPoint(0.5, 0.5);
        box.setPosition(0, 0, 0);

        const boxBgColor = options?.boxBgColor ?? DEFAULT_BOX_BG;
        const boxBorderColor = options?.boxBorderColor ?? DEFAULT_BOX_BORDER;
        GameHelpDialog.drawRoundRectBox(box, boxW, boxH, boxBgColor, boxBorderColor);

        const titleColor = options?.titleColor ?? DEFAULT_TITLE_COLOR;
        GameHelpDialog.addTitle(box, boxW, boxH, title, titleColor);

        const contentTopY = boxH * 0.5 - TITLE_H - TITLE_TOP_PAD - CONTENT_PAD;
        if (needsScroll) {
            GameHelpDialog.buildScrollContent(
                box,
                listW,
                contentViewH,
                contentTopY,
                lines,
                measured.heights,
                defaultFontSize,
                defaultColor,
                defaultLineHeight,
            );
        } else {
            GameHelpDialog.buildStaticContent(
                box,
                listW,
                contentTopY,
                lines,
                measured.heights,
                defaultFontSize,
                defaultColor,
                defaultLineHeight,
            );
        }

        const closeBtnColor = options?.closeBtnColor ?? DEFAULT_BTN_BG;
        GameHelpDialog.addCloseButton(box, boxW, boxH, closeBtnColor, closeOnClick);
    }

    private static measureLines(
        measureRoot: Node,
        lines: HelpDialogLine[],
        listW: number,
        defaultFontSize: number,
        defaultLineHeight: number,
    ): { heights: number[]; totalH: number } {
        const heights: number[] = [];
        let totalH = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const fontSize = line.fontSize ?? defaultFontSize;
            const lineHeight = Math.max(line.lineHeight ?? defaultLineHeight, fontSize + 6);
            const actualH = line.text
                ? GameHelpDialog.measureLineHeight(measureRoot, listW, line.text, fontSize, lineHeight)
                : lineHeight;

            heights.push(actualH);
            totalH += actualH;
            if (i < lines.length - 1) {
                totalH += LINE_GAP;
            }
        }

        return { heights, totalH };
    }

    private static measureLineHeight(
        measureRoot: Node,
        listW: number,
        text: string,
        fontSize: number,
        lineHeight: number,
    ): number {
        const lineNode = new Node('MeasureLine');
        lineNode.parent = measureRoot;
        lineNode.layer = measureRoot.layer;
        const ut = lineNode.addComponent(UITransform);
        ut.setContentSize(listW, lineHeight);
        ut.setAnchorPoint(0, 1);

        const lb = lineNode.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.lineHeight = lineHeight;
        lb.horizontalAlign = Label.HorizontalAlign.LEFT;
        lb.verticalAlign = Label.VerticalAlign.TOP;
        lb.enableWrapText = true;
        lb.overflow = Label.Overflow.RESIZE_HEIGHT;
        applyGlobalLabelFont(lb);
        lb.updateRenderData(true);

        const height = ut.height;
        lineNode.destroy();
        return height;
    }

    private static buildStaticContent(
        box: Node,
        listW: number,
        contentTopY: number,
        lines: HelpDialogLine[],
        heights: number[],
        defaultFontSize: number,
        defaultColor: Color,
        defaultLineHeight: number,
    ): void {
        let currentY = contentTopY;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const fontSize = line.fontSize ?? defaultFontSize;
            const color = line.color ?? defaultColor;
            const lineHeight = Math.max(line.lineHeight ?? defaultLineHeight, fontSize + 6);
            const actualH = heights[i];

            if (line.text) {
                GameHelpDialog.addContentLine(
                    box,
                    i,
                    listW,
                    currentY,
                    line.text,
                    fontSize,
                    lineHeight,
                    color,
                    actualH,
                );
            }

            currentY -= actualH + LINE_GAP;
        }
    }

    private static buildScrollContent(
        box: Node,
        listW: number,
        scrollH: number,
        contentTopY: number,
        lines: HelpDialogLine[],
        heights: number[],
        defaultFontSize: number,
        defaultColor: Color,
        defaultLineHeight: number,
    ): void {
        const contentTotalH = heights.reduce((sum, h, i) => {
            return sum + h + (i < heights.length - 1 ? LINE_GAP : 0);
        }, 0);

        const scrollNode = new Node('HelpScroll');
        scrollNode.parent = box;
        scrollNode.layer = box.layer;
        scrollNode.setPosition(0, contentTopY - scrollH * 0.5, 0);
        const scrollUt = scrollNode.addComponent(UITransform);
        scrollUt.setContentSize(listW, scrollH);
        scrollUt.setAnchorPoint(0.5, 0.5);

        const scroll = scrollNode.addComponent(ScrollView);
        scroll.horizontal = false;
        scroll.vertical = true;
        scroll.inertia = true;
        scroll.elastic = true;
        scroll.bounceDuration = 0.23;

        const viewNode = new Node('view');
        viewNode.parent = scrollNode;
        viewNode.layer = box.layer;
        const viewUt = viewNode.addComponent(UITransform);
        viewUt.setContentSize(listW, scrollH);
        viewUt.setAnchorPoint(0.5, 0.5);
        viewNode.setPosition(0, 0, 0);
        viewNode.addComponent(Mask);

        const content = new Node('content');
        content.parent = viewNode;
        content.layer = box.layer;
        const contentUt = content.addComponent(UITransform);
        contentUt.setContentSize(listW, Math.max(scrollH, contentTotalH));
        contentUt.setAnchorPoint(0.5, 1);
        content.setPosition(0, scrollH * 0.5, 0);
        scroll.content = content;

        let currentY = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const fontSize = line.fontSize ?? defaultFontSize;
            const color = line.color ?? defaultColor;
            const lineHeight = Math.max(line.lineHeight ?? defaultLineHeight, fontSize + 6);
            const actualH = heights[i];

            if (line.text) {
                GameHelpDialog.addContentLine(
                    content,
                    i,
                    listW,
                    currentY,
                    line.text,
                    fontSize,
                    lineHeight,
                    color,
                    actualH,
                );
            }

            currentY -= actualH + LINE_GAP;
        }
    }

    private static drawRoundRectBox(
        box: Node,
        boxW: number,
        boxH: number,
        fillColor: Color,
        strokeColor: Color,
    ): void {
        const bgNode = new Node('HelpBoxBg');
        bgNode.parent = box;
        bgNode.layer = box.layer;
        bgNode.setPosition(0, 0, 0);
        const bgUt = bgNode.addComponent(UITransform);
        bgUt.setContentSize(boxW, boxH);
        bgUt.setAnchorPoint(0.5, 0.5);

        const g = bgNode.addComponent(Graphics);
        const x = -boxW * 0.5;
        const y = -boxH * 0.5;
        const r = 16;

        g.fillColor = fillColor;
        g.moveTo(x + r, y);
        g.lineTo(x + boxW - r, y);
        g.quadraticCurveTo(x + boxW, y, x + boxW, y + r);
        g.lineTo(x + boxW, y + boxH - r);
        g.quadraticCurveTo(x + boxW, y + boxH, x + boxW - r, y + boxH);
        g.lineTo(x + r, y + boxH);
        g.quadraticCurveTo(x, y + boxH, x, y + boxH - r);
        g.lineTo(x, y + r);
        g.quadraticCurveTo(x, y, x + r, y);
        g.close();
        g.fill();

        g.lineWidth = 1.5;
        g.strokeColor = strokeColor;
        g.moveTo(x + r, y);
        g.lineTo(x + boxW - r, y);
        g.quadraticCurveTo(x + boxW, y, x + boxW, y + r);
        g.lineTo(x + boxW, y + boxH - r);
        g.quadraticCurveTo(x + boxW, y + boxH, x + boxW - r, y + boxH);
        g.lineTo(x + r, y + boxH);
        g.quadraticCurveTo(x, y + boxH, x, y + boxH - r);
        g.lineTo(x, y + r);
        g.quadraticCurveTo(x, y, x + r, y);
        g.close();
        g.stroke();
    }

    private static addTitle(
        parent: Node,
        boxW: number,
        boxH: number,
        text: string,
        color: Color,
    ): void {
        const titleNode = new Node('Title');
        titleNode.parent = parent;
        titleNode.layer = parent.layer;
        const tUt = titleNode.addComponent(UITransform);
        tUt.setContentSize(boxW - 40, TITLE_H);
        tUt.setAnchorPoint(0.5, 0.5);
        titleNode.setPosition(0, boxH * 0.5 - TITLE_H * 0.5 - TITLE_TOP_PAD, 0);
        const tLb = titleNode.addComponent(Label);
        tLb.string = text;
        tLb.fontSize = 24;
        tLb.lineHeight = 32;
        tLb.color = color;
        tLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        tLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(tLb);
    }

    /** 关闭按钮：圆形背景 + Graphics 画叉（与圆形同渲染路径，不依赖 Label/iconfont） */
    private static addCloseButton(
        parent: Node,
        boxW: number,
        boxH: number,
        btnColor: Color,
        onClick: () => void,
    ): void {
        const btnSize = 36;
        const btnX = boxW * 0.5 - 26;
        const btnY = boxH * 0.5 - 26;

        const closeBtn = new Node('CloseBtn');
        closeBtn.parent = parent;
        closeBtn.layer = parent.layer;
        closeBtn.setPosition(btnX, btnY, 0);
        const ut = closeBtn.addComponent(UITransform);
        ut.setContentSize(btnSize, btnSize);
        ut.setAnchorPoint(0.5, 0.5);

        const g = closeBtn.addComponent(Graphics);
        g.fillColor = btnColor;
        g.circle(0, 0, 16);
        g.fill();
        GameHelpDialog.drawCloseCross(g, Color.WHITE);

        const btn = closeBtn.addComponent(Button);
        btn.transition = Button.Transition.NONE;
        closeBtn.on(Button.EventType.CLICK, onClick, closeBtn);

        closeBtn.setSiblingIndex(parent.children.length - 1);
    }

    private static drawCloseCross(g: Graphics, color: Color): void {
        const arm = 7;
        g.lineWidth = 2.5;
        g.strokeColor = color;
        g.moveTo(-arm, arm);
        g.lineTo(arm, -arm);
        g.moveTo(-arm, -arm);
        g.lineTo(arm, arm);
        g.stroke();
    }

    private static addContentLine(
        parent: Node,
        index: number,
        listW: number,
        y: number,
        text: string,
        fontSize: number,
        lineHeight: number,
        color: Color,
        displayHeight: number,
    ): number {
        const lineNode = new Node(`Line_${index}`);
        lineNode.parent = parent;
        lineNode.layer = parent.layer;
        const ut = lineNode.addComponent(UITransform);
        ut.setContentSize(listW, displayHeight);
        ut.setAnchorPoint(0, 1);
        lineNode.setPosition(-listW * 0.5, y, 0);

        const lb = lineNode.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.lineHeight = lineHeight;
        lb.color = color;
        lb.horizontalAlign = Label.HorizontalAlign.LEFT;
        lb.verticalAlign = Label.VerticalAlign.TOP;
        lb.enableWrapText = true;
        lb.overflow = Label.Overflow.CLAMP;
        applyGlobalLabelFont(lb);
        lb.updateRenderData(true);

        return displayHeight;
    }
}
