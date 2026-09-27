import {
    _decorator,
    Color,
    Component,
    director,
    Label,
    Node,
    UITransform,
    Widget,
} from 'cc';
import { OneStrokeBoardView } from './OneStrokeBoardView';
import { OneStrokeFrameLayout } from './OneStrokeFrameLayout';
import { computeOneStrokeLayout, OneStrokeLayoutMetrics } from './OneStrokeUILayout';
import { levelManager } from './OneStrokeLevelManager';
import { loadIconFont } from '../../core/IconFont';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import {
    buildGameChromeActionBar,
    buildGameChromeAdStrip,
    refreshGameChromeIconLabels,
    GAME_CHROME_SLOTS,
} from '../../game/chrome/GameChromeBuilder';
import { GAME_CHROME_LAYOUT, GAME_CHROME_PALETTE } from '../../game/chrome/GameChromeConfig';
import { GameHelpDialog, HelpDialogLine, HelpDialogOptions } from '../../game/chrome/GameHelpDialog';
import { GameWinToast } from '../../game/chrome/GameWinToast';
import { LeaderboardPopup } from '../../game/chrome/LeaderboardPopup';

const { ccclass } = _decorator;

const LEVEL_INK = new Color(
    GAME_CHROME_PALETTE.PRIMARY.r,
    GAME_CHROME_PALETTE.PRIMARY.g,
    GAME_CHROME_PALETTE.PRIMARY.b,
    255,
);
const HELP_ACCENT = new Color(255, 189, 0, 255);

@ccclass('OneStrokeFramework')
export class OneStrokeFramework extends Component {
    private _levelLabel: Label | null = null;
    private _boardView: OneStrokeBoardView | null = null;
    private _isTransitioning = false;

    onLoad(): void {
        const root = this.node;
        const parentTrans = root.parent?.getComponent(UITransform);
        const cw = parentTrans ? parentTrans.width : 720;
        const ch = parentTrans ? parentTrans.height : 1280;
        const m = computeOneStrokeLayout(cw, ch);

        levelManager.resetToFirst();
        levelManager.init(() => {
            this._buildUI(root, cw, ch, m);
        });
    }

    private _buildUI(root: Node, cw: number, ch: number, m: OneStrokeLayoutMetrics): void {
        const wrap = new Node('OneStrokeRoot');
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

        const chrome = new Node('FrameChrome');
        chrome.parent = wrap;
        chrome.layer = wrap.layer;
        chrome.setSiblingIndex(0);
        const cUt = chrome.addComponent(UITransform);
        cUt.setContentSize(cw, ch);
        cUt.setAnchorPoint(0.5, 0.5);
        chrome.setPosition(0, 0, 0);
        const cW = chrome.addComponent(Widget);
        cW.isAlignTop = true;
        cW.isAlignBottom = true;
        cW.isAlignLeft = true;
        cW.isAlignRight = true;
        cW.top = 0;
        cW.bottom = 0;
        cW.left = 0;
        cW.right = 0;
        cW.alignMode = 2;
        chrome.addComponent(OneStrokeFrameLayout);
        this._levelLabel = this.addLabel(wrap, 'Level', m.yLevel, cw - 48, 44, `第 ${levelManager.currentLevel} 关`, 30, 38, LEVEL_INK, Label.HorizontalAlign.CENTER);

        const boardRoot = new Node('BoardRoot');
        boardRoot.parent = wrap;
        boardRoot.layer = wrap.layer;
        const bUt = boardRoot.addComponent(UITransform);
        bUt.setContentSize(m.boardSide, m.boardSide);
        bUt.setAnchorPoint(0.5, 0.5);
        boardRoot.setPosition(m.boardCx, m.boardCy, 0);

        const boardView = boardRoot.addComponent(OneStrokeBoardView);
        this._boardView = boardView;
        boardView.setCallbacks({
            onWin: () => {
                if (this._isTransitioning) {
                    return;
                }
                this._isTransitioning = true;
                this._loadNextLevel(wrap, m, cw);
            },
        });

        boardView.loadLevel(levelManager.currentLevel);

        this._mountBottomChrome(wrap, wrap.layer, cw, m);
    }

    private _mountBottomChrome(parent: Node, layer: number, cw: number, m: OneStrokeLayoutMetrics): void {
        buildGameChromeAdStrip(parent, layer, { cw, stripHeight: m.adH, label: '广告' });
        const bottomBtnY = m.adTopY + GAME_CHROME_LAYOUT.ACTION_BAR_CENTER_OFFSET;
        const refs = buildGameChromeActionBar(parent, layer, {
            cw,
            centerY: bottomBtnY,
            slots: [
                GAME_CHROME_SLOTS.home(() => this._exitToLobby()),
                GAME_CHROME_SLOTS.leaderboard(() => this._onLeaderboardClicked()),
                GAME_CHROME_SLOTS.refresh(() => this._onRefreshClicked()),
                GAME_CHROME_SLOTS.help(() => this._onHelpClicked()),
                GAME_CHROME_SLOTS.share('one_stroke'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    private addLabel(
        parent: Node,
        name: string,
        y: number,
        w: number,
        h: number,
        text: string,
        fontSize: number,
        lineHeight: number,
        color: Color,
        hAlign: number,
        x = 0,
    ): Label {
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
        lb.overflow = Label.Overflow.SHRINK;
        applyGlobalLabelFont(lb);
        return lb;
    }

    private _loadNextLevel(wrap: Node, m: OneStrokeLayoutMetrics, cw: number): void {
        setTimeout(() => {
            if (!levelManager.nextLevel()) {
                this._isTransitioning = false;
                this._showWinToast(wrap);
                return;
            }

            if (this._levelLabel) {
                this._levelLabel.string = `第 ${levelManager.currentLevel} 关`;
            }

            if (this._boardView) {
                this._boardView.loadLevel(levelManager.currentLevel);
            }
            this._isTransitioning = false;
        }, 500);
    }

    private _showWinToast(wrap: Node): void {
        GameWinToast.show(
            wrap,
            () => {
                levelManager.resetToFirst();
                if (this._levelLabel) {
                    this._levelLabel.string = `第 ${levelManager.currentLevel} 关`;
                }
                if (this._boardView) {
                    this._boardView.loadLevel(levelManager.currentLevel);
                }
                this._isTransitioning = false;
            },
            () => this._exitToLobby(),
            {
                subTitle: '全部关卡已完成',
            },
        );
    }

    private _exitToLobby(): void {
        director.loadScene('Lobby');
    }

    private _onRefreshClicked(): void {
        if (this._boardView) {
            this._boardView.resetBoard();
        }
    }

    private _onLeaderboardClicked(): void {
        const parent = this.node.getChildByName('OneStrokeRoot');
        if (!parent) {
            return;
        }
        LeaderboardPopup.show(parent);
    }

    private _onHelpClicked(): void {
        const parent = this.node.getChildByName('OneStrokeRoot');
        if (!parent) {
            return;
        }
        const helpLines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: HELP_ACCENT, lineHeight: 28 },
            { text: '用一笔划过图形中的所有边，不能重复走同一条边' },
            { text: '操作方法', fontSize: 18, color: HELP_ACCENT, lineHeight: 28 },
            { text: '按住并滑动，从合适起点开始连线' },
            { text: '带箭头的边只能按箭头方向通过' },
            { text: '游戏规则', fontSize: 18, color: HELP_ACCENT, lineHeight: 28 },
            { text: '全部边都走过一次即过关；可点击刷新重试本关' },
            { text: '游戏技巧', fontSize: 18, color: HELP_ACCENT, lineHeight: 28 },
            { text: '统计每个顶点连接的边数，若存在奇数点，可尝试从奇数点开始' },
        ];
        this._showHelpDialog(parent, '游戏帮助', helpLines);
    }

    private _showHelpDialog(
        parent: Node,
        title: string,
        lines: HelpDialogLine[],
        options?: HelpDialogOptions,
    ): void {
        GameHelpDialog.show(parent, title, lines, options);
    }
}
