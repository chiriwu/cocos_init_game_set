/**
 * 一笔画界面布局（参考「快速口算」式竖屏：顶标题+状态行、大白板游戏区、底广告位）
 * 坐标系：父节点锚点 (0.5,0.5)，y 轴向上，屏上下边界为 ±ch/2。
 */
import { GAME_CHROME_LAYOUT } from '../../game/chrome/GameChromeConfig';
import { getAdStripHeight } from '../../game/chrome/GameChromeLayout';

export interface OneStrokeLayoutMetrics {
    cw: number;
    ch: number;
    marginX: number;
    marginTop: number;
    adH: number;
    yTitle: number;
    yLevel: number;
    yStatus: number;
    contentTop: number;
    contentBottom: number;
    whiteHalfW: number;
    whiteHalfH: number;
    whiteCy: number;
    boardSide: number;
    boardCx: number;
    boardCy: number;
    adTopY: number;
    adBottomY: number;
}

export function computeOneStrokeLayout(cw: number, ch: number): OneStrokeLayoutMetrics {
    const hh = ch * 0.5;
    const marginX = GAME_CHROME_LAYOUT.MARGIN_X;
    const marginTop = GAME_CHROME_LAYOUT.MARGIN_TOP;
    const adStripH = getAdStripHeight();
    const adH = adStripH <= 0
        ? 0
        : Math.min(
            GAME_CHROME_LAYOUT.AD_HEIGHT_MAX,
            Math.max(GAME_CHROME_LAYOUT.AD_HEIGHT_MIN, ch * GAME_CHROME_LAYOUT.AD_HEIGHT_RATIO)
        );
    const headerTitleH = 40;
    const levelGap = 4;
    const statusH = 34;
    const blockGap = GAME_CHROME_LAYOUT.BLOCK_GAP;
    const innerPad = GAME_CHROME_LAYOUT.INNER_PAD;

    const yTop = hh - marginTop;
    const yTitle = yTop - headerTitleH * 0.5;
    const yLevel = yTitle - headerTitleH * 0.5 - levelGap - 11;
    const yStatus = yLevel - 12 - statusH * 0.5;

    const adBottomY = -hh;
    const adTopY = adBottomY + adH;
    const actionBarH = GAME_CHROME_LAYOUT.ACTION_BAR_HEIGHT;
    const actionBarGap = GAME_CHROME_LAYOUT.ACTION_BAR_GAP;
    const contentBottom = adTopY + actionBarH + actionBarGap + innerPad;
    const contentTop = yStatus - statusH * 0.5 - blockGap - innerPad;

    const whiteHalfW = cw * 0.5 - marginX - innerPad;
    const whiteHalfH = (contentTop - contentBottom) * 0.5;
    const whiteCy = (contentTop + contentBottom) * 0.5;

    const boardSide = Math.min(whiteHalfW * 2 - 24, whiteHalfH * 2 - 20);
    const boardCx = 0;
    const boardCy = whiteCy + 4;

    return {
        cw,
        ch,
        marginX,
        marginTop,
        adH,
        yTitle,
        yLevel,
        yStatus,
        contentTop,
        contentBottom,
        whiteHalfW,
        whiteHalfH,
        whiteCy,
        boardSide,
        boardCx,
        boardCy,
        adTopY,
        adBottomY,
    };
}
