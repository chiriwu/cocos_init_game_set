import {
    Button,
    Color,
    Graphics,
    Label,
    Node,
    UITransform,
} from 'cc';
import { applyGlobalLabelFont } from '../../core/LabelFont';

export interface GameFailToastOptions {
    toastWidth?: number;
    toastHeight?: number;
    bgColor?: Color;
    textColor?: Color;
    retryBtnColor?: Color;
    retryBtnTextColor?: Color;
    homeBtnColor?: Color;
    homeBtnTextColor?: Color;
    title?: string;
    subTitle?: string;
    hint?: string;
}

const DEFAULT_TOAST_WIDTH = 300;
const DEFAULT_TOAST_HEIGHT = 200;
const DEFAULT_BG_COLOR = new Color(239, 83, 80, 210);
const DEFAULT_TEXT_COLOR = Color.WHITE;
const DEFAULT_RETRY_BTN_COLOR = Color.WHITE;
const DEFAULT_RETRY_TEXT_COLOR = new Color(0, 188, 212, 255);
const DEFAULT_HOME_BG_COLOR = new Color(255, 240, 200, 255);
const DEFAULT_HOME_TEXT_COLOR = new Color(139, 90, 43, 255);
const DEFAULT_TITLE = '时间到！';
const DEFAULT_SUB_TITLE = '挑战失败';

export class GameFailToast {
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
        options?: GameFailToastOptions,
    ): void {
        if (this._activeToast?.isValid) {
            return;
        }

        const toastW = options?.toastWidth ?? DEFAULT_TOAST_WIDTH;
        const toastH = options?.toastHeight ?? DEFAULT_TOAST_HEIGHT;
        const bgColor = options?.bgColor ?? DEFAULT_BG_COLOR;
        const textColor = options?.textColor ?? DEFAULT_TEXT_COLOR;
        const title = options?.title ?? DEFAULT_TITLE;
        const subTitle = options?.subTitle ?? DEFAULT_SUB_TITLE;
        const hint = options?.hint ?? '';

        const toast = new Node('FailToast');
        toast.parent = parent;
        toast.layer = parent.layer;
        GameFailToast._activeToast = toast;

        const tUt = toast.addComponent(UITransform);
        tUt.setContentSize(toastW, toastH);
        tUt.setAnchorPoint(0.5, 0.5);
        toast.setPosition(0, 0, 0);

        const toastBg = new Node('FailToastBg');
        toastBg.parent = toast;
        toastBg.layer = toast.layer;
        const toastBgUt = toastBg.addComponent(UITransform);
        toastBgUt.setContentSize(toastW, toastH);
        toastBgUt.setAnchorPoint(0.5, 0.5);
        const tG = toastBg.addComponent(Graphics);
        tG.fillColor = bgColor;
        tG.roundRect(-toastW * 0.5, -toastH * 0.5, toastW, toastH, 16);
        tG.fill();

        const textContent = hint ? `${title}\n${subTitle}\n${hint}` : `${title}\n${subTitle}`;
        const tLbNode = new Node('FailToastLabel');
        tLbNode.parent = toast;
        tLbNode.layer = toast.layer;
        tLbNode.setPosition(0, 44, 0);
        const tLbUt = tLbNode.addComponent(UITransform);
        tLbUt.setContentSize(toastW - 24, 100);
        tLbUt.setAnchorPoint(0.5, 0.5);
        const tLb = tLbNode.addComponent(Label);
        tLb.string = textContent;
        tLb.fontSize = 20;
        tLb.lineHeight = 26;
        tLb.color = textColor;
        tLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        tLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(tLb);

        GameFailToast.addRetryButton(
            toast,
            onRetry,
            options?.retryBtnColor ?? DEFAULT_RETRY_BTN_COLOR,
            options?.retryBtnTextColor ?? DEFAULT_RETRY_TEXT_COLOR,
        );

        GameFailToast.addHomeButton(
            toast,
            onHome,
            options?.homeBtnColor ?? DEFAULT_HOME_BG_COLOR,
            options?.homeBtnTextColor ?? DEFAULT_HOME_TEXT_COLOR,
        );
    }

    private static addRetryButton(
        parent: Node,
        onClick: () => void,
        bgColor: Color,
        textColor: Color,
    ): void {
        const retryBtn = new Node('RetryBtn');
        retryBtn.parent = parent;
        retryBtn.layer = parent.layer;
        const rbUt = retryBtn.addComponent(UITransform);
        rbUt.setContentSize(120, 40);
        rbUt.setAnchorPoint(0.5, 0.5);
        retryBtn.setPosition(-50, -50, 0);

        const rbBg = new Node('RetryBg');
        rbBg.parent = retryBtn;
        rbBg.layer = retryBtn.layer;
        const rbBgUt = rbBg.addComponent(UITransform);
        rbBgUt.setContentSize(120, 40);
        rbBgUt.setAnchorPoint(0.5, 0.5);
        const rbG = rbBg.addComponent(Graphics);
        rbG.fillColor = bgColor;
        rbG.roundRect(-60, -20, 120, 40, 8);
        rbG.fill();

        const rbLbNode = new Node('RetryLabel');
        rbLbNode.parent = retryBtn;
        rbLbNode.layer = retryBtn.layer;
        const rbLbUt = rbLbNode.addComponent(UITransform);
        rbLbUt.setContentSize(120, 40);
        rbLbUt.setAnchorPoint(0.5, 0.5);
        const rbLb = rbLbNode.addComponent(Label);
        rbLb.string = '再试一次';
        rbLb.fontSize = 18;
        rbLb.lineHeight = 22;
        rbLb.color = textColor;
        rbLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        rbLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(rbLb);

        const rbBtn = retryBtn.addComponent(Button);
        rbBtn.transition = Button.Transition.NONE;
        retryBtn.on(Button.EventType.CLICK, () => {
            GameFailToast.dismiss();
            onClick();
        }, retryBtn);
    }

    private static addHomeButton(
        parent: Node,
        onClick: () => void,
        bgColor: Color,
        textColor: Color,
    ): void {
        const homeBtn = new Node('HomeBtn');
        homeBtn.parent = parent;
        homeBtn.layer = parent.layer;
        const hUt = homeBtn.addComponent(UITransform);
        hUt.setContentSize(120, 40);
        hUt.setAnchorPoint(0.5, 0.5);
        homeBtn.setPosition(50, -50, 0);

        const hBg = new Node('HomeBg');
        hBg.parent = homeBtn;
        hBg.layer = homeBtn.layer;
        const hBgUt = hBg.addComponent(UITransform);
        hBgUt.setContentSize(120, 40);
        hBgUt.setAnchorPoint(0.5, 0.5);
        const hG = hBg.addComponent(Graphics);
        hG.fillColor = bgColor;
        hG.roundRect(-60, -20, 120, 40, 8);
        hG.fill();

        const hLbNode = new Node('HomeLabel');
        hLbNode.parent = homeBtn;
        hLbNode.layer = homeBtn.layer;
        const hLbUt = hLbNode.addComponent(UITransform);
        hLbUt.setContentSize(120, 40);
        hLbUt.setAnchorPoint(0.5, 0.5);
        const hLb = hLbNode.addComponent(Label);
        hLb.string = '回到主页';
        hLb.fontSize = 18;
        hLb.lineHeight = 22;
        hLb.color = textColor;
        hLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        hLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(hLb);

        const hBtn = homeBtn.addComponent(Button);
        hBtn.transition = Button.Transition.NONE;
        homeBtn.on(Button.EventType.CLICK, () => {
            GameFailToast.dismiss();
            onClick();
        }, homeBtn);
    }
}
