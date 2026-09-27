import { _decorator, Color, Component, Graphics, UITransform } from 'cc';
import { computeOneStrokeLayout } from './OneStrokeUILayout';
import { GAME_CHROME_PALETTE } from '../../game/chrome/GameChromeConfig';

const { ccclass, executeInEditMode } = _decorator;

const PAPER = GAME_CHROME_PALETTE.BOARD_BG;
const LINE = GAME_CHROME_PALETTE.LINE;
const CARD = new Color(255, 254, 252, 255);
const AD_BG = GAME_CHROME_PALETTE.AD_BG;

/**
 * 一笔画界面底图：顶区留白给标题/状态行、中央大白板+棋盘框、底部广告条。
 */
@ccclass('OneStrokeFrameLayout')
@executeInEditMode
export class OneStrokeFrameLayout extends Component {
    private _g: Graphics | null = null;

    onLoad(): void {
        this._ensureGraphics();
        this.redraw();
        const ut = this.getComponent(UITransform);
        if (ut) {
            this.node.on(UITransform.EventType.SIZE_CHANGED, this.redraw, this);
        }
    }

    onDestroy(): void {
        this.node.off(UITransform.EventType.SIZE_CHANGED, this.redraw, this);
    }

    private _ensureGraphics(): void {
        this._g = this.getComponent(Graphics);
        if (!this._g) {
            this._g = this.addComponent(Graphics);
        }
    }

    redraw(): void {
        this._ensureGraphics();
        const g = this._g!;
        const ut = this.getComponent(UITransform);
        if (!ut) {
            return;
        }
        const cw = ut.width;
        const ch = ut.height;
        const hw = cw * 0.5;
        const hh = ch * 0.5;
        const m = computeOneStrokeLayout(cw, ch);

        g.clear();

        g.fillColor = PAPER;
        g.rect(-hw, -hh, cw, ch);
        g.fill();

        const xL = -hw + m.marginX;
        const xR = hw - m.marginX;
        const lineUnderStatus = m.yStatus - 17;
        g.lineWidth = 1;
        g.strokeColor = LINE;
        g.moveTo(xL, lineUnderStatus);
        g.lineTo(xR, lineUnderStatus);
        g.stroke();

        const wx = -m.whiteHalfW;
        const wy = m.whiteCy - m.whiteHalfH;
        const ww = m.whiteHalfW * 2;
        const wh = m.whiteHalfH * 2;
        const rCard = 14;

        // g.fillColor = CARD;
        g.roundRect(wx, wy, ww, wh, rCard);
        g.fill();

        g.lineWidth = 1;
        g.strokeColor = LINE;
        g.roundRect(wx + 0.5, wy + 0.5, ww - 1, wh - 1, rCard);
        g.stroke();

        g.fillColor = AD_BG;
        g.rect(-hw, m.adBottomY, cw, m.adH);
        g.fill();

        g.lineWidth = 1;
        g.strokeColor = LINE;
        g.moveTo(-hw, m.adTopY);
        g.lineTo(hw, m.adTopY);
        g.stroke();

        g.strokeColor = new Color(LINE.r, LINE.g, LINE.b, 180);
        g.roundRect(-hw + m.marginX + 4, m.adBottomY + 8, cw - (m.marginX + 4) * 2, m.adH - 16, 8);
        g.stroke();
    }
}
