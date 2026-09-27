import {
    _decorator,
    Button,
    Color,
    Component,
    director,
    Graphics,
    Label,
    Node,
    tween,
    UITransform,
    v3,
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
import { GameHelpDialog, HelpDialogLine, HelpDialogOptions } from '../../game/chrome/GameHelpDialog';
import { GameWinToast } from '../../game/chrome/GameWinToast';
import { LeaderboardPopup } from '../../game/chrome/LeaderboardPopup';
import { POUR_WATER_LEVELS, PourWaterCore, Tube } from './PourWaterCore';
const { ccclass } = _decorator;

const NAV_BAR_H = 56;
const TUBE_WIDTH = 56;
const TUBE_HEIGHT = 200;
const TUBE_GAP = 36;
const ROW_GAP = 48;
const SELECTED_OFFSET = 28;

const TUBE_WALL = 6;
const TUBE_LIP = 10;
const TUBE_BOTTOM_R = 20;
const LIQUID_INSET = 10;

/** 与 _drawTubeGlass 共用：试管内壁垂直范围 */
function tubeInnerBounds(): { bottom: number; top: number; height: number } {
    const halfH = TUBE_HEIGHT * 0.5;
    const bottomY = -halfH + 8;
    const topY = halfH - TUBE_LIP - 4;
    const innerBottom = bottomY + TUBE_BOTTOM_R * 0.35 + 2;
    const innerTop = topY - 2;
    return { bottom: innerBottom, top: innerTop, height: innerTop - innerBottom };
}

const TUBE_STROKE = new Color(101, 67, 33, 255);
const TUBE_RIM = new Color(139, 90, 43, 255);
const TUBE_HIGHLIGHT = new Color(255, 255, 255, 60);

const COLOR_MAP: Record<string, Color> = {
    red: new Color(233, 61, 69, 255),
    blue: new Color(50, 197, 244, 255),
    green: new Color(76, 175, 0, 255),
    yellow: new Color(255, 193, 7, 255),
    orange: new Color(255, 152, 0, 255),
    purple: new Color(156, 39, 176, 255),
    pink: new Color(244, 143, 177, 255),
    gray: new Color(158, 158, 158, 255),
};

@ccclass('PourWaterFramework')
export class PourWaterFramework extends Component {
    private _core: PourWaterCore = new PourWaterCore();
    private _layer = 0;
    private _currentLevel = 0;
    private _selectedTube: Node | null = null;
    private _tubeNodes: Node[] = [];
    private _tubeIndexMap = new Map<Node, number>();
    private _tubeBaseY = new Map<Node, number>();
    private _levelLabel: Label | null = null;

    onLoad(): void {
        loadIconFont(() => {
            const slot = this.node;
            const slotUt = slot.getComponent(UITransform);
            const cw = slotUt?.width ?? 750;
            const ch = slotUt?.height ?? 1280;
            this._layer = slot.layer;

            this._buildRoot(slot, this._layer, cw, ch);
        });
    }

    onDestroy(): void {
        this._core.reset();
    }

    private _segmentHeight(): number {
        const cap = this._core.capacity;
        const { height } = tubeInnerBounds();
        return cap > 0 ? height / cap : height / 4;
    }

    private _buildRoot(slot: Node, layer: number, cw: number, ch: number): void {
        const root = new Node('PourWaterRoot');
        root.parent = slot;
        root.layer = layer;
        const rootUt = root.addComponent(UITransform);
        rootUt.setContentSize(cw, ch);
        rootUt.setAnchorPoint(0.5, 0.5);
        root.setPosition(0, 0, 0);

        const rootBg = root.addComponent(Graphics);
        rootBg.fillColor = GAME_CHROME_PALETTE.BOARD_BG;
        rootBg.rect(-cw * 0.5, -ch * 0.5, cw, ch);
        rootBg.fill();

        this._buildNavBar(root, layer, cw);
        this._buildHeader(root, layer, cw);
        this._buildGameArea(root, layer, cw, ch);
        this._mountBottomChrome(root, layer, cw, ch);
        this._startLevel();
    }

    private _buildNavBar(parent: Node, layer: number, cw: number): void {
        const nb = new Node('NavBar');
        nb.parent = parent;
        nb.layer = layer;
        const nbUt = nb.addComponent(UITransform);
        nbUt.setContentSize(cw, NAV_BAR_H);
        nbUt.setAnchorPoint(0.5, 0.5);
        nb.setPosition(0, parent.getComponent(UITransform)!.height * 0.5 - NAV_BAR_H * 0.5, 0);

        const nbBg = new Node('NavBg');
        nbBg.parent = nb;
        nbBg.layer = layer;
        const nbBgUt = nbBg.addComponent(UITransform);
        nbBgUt.setContentSize(cw, NAV_BAR_H);
        nbBgUt.setAnchorPoint(0.5, 0.5);
        const nbG = nbBg.addComponent(Graphics);
        nbG.fillColor = GAME_CHROME_PALETTE.BOARD_BG;

        nbG.rect(-cw * 0.5, -NAV_BAR_H * 0.5, cw, NAV_BAR_H);
        nbG.fill();

        // const title = new Node('Title');
        // title.parent = nb;
        // title.layer = layer;
        // const titleUt = title.addComponent(UITransform);
        // titleUt.setContentSize(200, NAV_BAR_H);
        // titleUt.setAnchorPoint(0.5, 0.5);
        // title.setPosition(0, 0, 0);
        // const titleLb = title.addComponent(Label);
        // titleLb.string = '倒水解谜';
        // titleLb.fontSize = 24;
        // titleLb.color = new Color(114, 80, 51, 255);
        // titleLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        // titleLb.verticalAlign = Label.VerticalAlign.CENTER;
        // applyGlobalLabelFont(titleLb);
    }

    private _buildHeader(parent: Node, layer: number, cw: number): void {
        const header = new Node('Header');
        header.parent = parent;
        header.layer = layer;
        const hUt = header.addComponent(UITransform);
        hUt.setContentSize(cw, 60);
        hUt.setAnchorPoint(0.5, 0.5);
        const parentHeight = parent.getComponent(UITransform)!.height;
        header.setPosition(0, parentHeight * 0.5 - NAV_BAR_H - 30, 0);

        const levelBg = new Node('LevelBg');
        levelBg.parent = header;
        levelBg.layer = layer;
        const lbUt = levelBg.addComponent(UITransform);
        lbUt.setContentSize(160, 40);
        lbUt.setAnchorPoint(0.5, 0.5);
        levelBg.setPosition(0, 0, 0);
        const lbG = levelBg.addComponent(Graphics);
        lbG.fillColor = new Color(181, 142, 96, 255);
        lbG.roundRect(-80, -20, 160, 40, 8);
        lbG.fill();

        const levelLabel = new Node('LevelLabel');
        levelLabel.parent = levelBg;
        levelLabel.layer = layer;
        const llUt = levelLabel.addComponent(UITransform);
        llUt.setContentSize(160, 40);
        llUt.setAnchorPoint(0.5, 0.5);
        levelLabel.setPosition(0, 0, 0);
        this._levelLabel = levelLabel.addComponent(Label);
        this._levelLabel.string = `关卡: ${this._currentLevel + 1}`;
        this._levelLabel.fontSize = 20;
        this._levelLabel.color = new Color(255, 255, 255, 255);
        this._levelLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._levelLabel.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(this._levelLabel);
    }

    private _buildGameArea(parent: Node, layer: number, cw: number, ch: number): void {
        const gameArea = new Node('GameArea');
        gameArea.parent = parent;
        gameArea.layer = layer;
        const gaUt = gameArea.addComponent(UITransform);
        gaUt.setContentSize(cw - 40, ch - NAV_BAR_H - 60 - GAME_CHROME_ACTION_ROW_DEFAULT_H - getAdStripHeight() - 80);
        gaUt.setAnchorPoint(0.5, 0.5);
        gameArea.setPosition(0, 0, 0);

        const bgG = gameArea.addComponent(Graphics);
        bgG.fillColor = GAME_CHROME_PALETTE.BOARD_BG;
        bgG.roundRect(-gaUt.width * 0.5, -gaUt.height * 0.5, gaUt.width, gaUt.height, 10);
        bgG.fill();

        this._buildTubes(gameArea, layer, gaUt.width, gaUt.height);
    }

    private _layoutCols(tubeCount: number, areaW: number): number {
        const maxCols = Math.floor((areaW + TUBE_GAP) / (TUBE_WIDTH + TUBE_GAP));
        if (tubeCount <= 4) return tubeCount;
        if (tubeCount <= 5) return Math.min(5, maxCols);
        return Math.min(Math.max(4, maxCols), 5);
    }

    private _buildTubes(parent: Node, layer: number, areaW: number, _areaH: number): void {
        const tubes = this._core.tubes;
        const cols = this._layoutCols(tubes.length, areaW);
        const rows = Math.ceil(tubes.length / cols);

        const totalWidth = cols * TUBE_WIDTH + (cols - 1) * TUBE_GAP;
        const totalHeight = rows * TUBE_HEIGHT + (rows - 1) * ROW_GAP;
        const startX = -totalWidth / 2 + TUBE_WIDTH / 2;
        const startY = totalHeight / 2 - TUBE_HEIGHT / 2;

        this._tubeNodes = [];
        this._tubeBaseY.clear();

        tubes.forEach((tube, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (TUBE_WIDTH + TUBE_GAP);
            const y = startY - row * (TUBE_HEIGHT + ROW_GAP);

            const tubeNode = this._createTube(tube, layer);
            tubeNode.parent = parent;
            tubeNode.setPosition(x, y, 0);
            this._tubeIndexMap.set(tubeNode, index);
            this._tubeBaseY.set(tubeNode, y);

            const btn = tubeNode.addComponent(Button);
            btn.transition = Button.Transition.NONE;
            tubeNode.on(Button.EventType.CLICK, () => this._onTubeClick(tubeNode), this);

            this._tubeNodes.push(tubeNode);
        });
    }

    private _drawTubeGlass(g: Graphics): void {
        const hw = TUBE_WIDTH * 0.5;
        const halfH = TUBE_HEIGHT * 0.5;
        const left = -hw + TUBE_WALL;
        const right = hw - TUBE_WALL;
        const bottomY = -halfH + 8;
        const topY = halfH - TUBE_LIP - 4;
        const r = TUBE_BOTTOM_R;

        g.clear();
        g.strokeColor = TUBE_STROKE;
        g.lineWidth = 3;
        g.lineJoin = Graphics.LineJoin.ROUND;
        g.lineCap = Graphics.LineCap.ROUND;

        g.moveTo(left, topY);
        g.lineTo(left, bottomY + r);
        g.quadraticCurveTo(left, bottomY, 0, bottomY);
        g.quadraticCurveTo(right, bottomY, right, bottomY + r);
        g.lineTo(right, topY);
        g.stroke();

        g.moveTo(left, topY);
        g.lineTo(-hw + 3, topY + TUBE_LIP * 0.75);
        g.lineTo(hw - 3, topY + TUBE_LIP * 0.75);
        g.lineTo(right, topY);
        g.stroke();

        g.strokeColor = TUBE_HIGHLIGHT;
        g.lineWidth = 2;
        g.moveTo(left + 4, topY - 6);
        g.lineTo(left + 4, bottomY + r - 4);
        g.stroke();

        g.fillColor = TUBE_RIM;
        g.rect(-hw + 2, topY + TUBE_LIP * 0.35, TUBE_WIDTH - 4, 5);
        g.fill();
    }

    private _createTube(tube: Tube, layer: number): Node {
        const tubeNode = new Node('Tube');
        tubeNode.layer = layer;
        const tUt = tubeNode.addComponent(UITransform);
        tUt.setContentSize(TUBE_WIDTH, TUBE_HEIGHT);
        tUt.setAnchorPoint(0.5, 0.5);

        const glass = new Node('Glass');
        glass.parent = tubeNode;
        glass.layer = layer;
        const gUt = glass.addComponent(UITransform);
        gUt.setContentSize(TUBE_WIDTH, TUBE_HEIGHT);
        gUt.setAnchorPoint(0.5, 0.5);
        this._drawTubeGlass(glass.addComponent(Graphics));

        const { bottom, height } = tubeInnerBounds();
        const liquids = new Node('Liquids');
        liquids.parent = tubeNode;
        liquids.layer = layer;
        const liquidW = TUBE_WIDTH - LIQUID_INSET * 2;
        const lUt = liquids.addComponent(UITransform);
        lUt.setContentSize(liquidW, height + TUBE_BOTTOM_R * 0.5);
        lUt.setAnchorPoint(0.5, 0);
        liquids.setPosition(0, bottom - TUBE_BOTTOM_R * 0.35, 0);

        this._updateTubeLiquids(liquids, tube.colors, layer, height + TUBE_BOTTOM_R * 0.5);

        return tubeNode;
    }

    private _updateTubeLiquids(parent: Node, colors: string[], layer: number, containerHeight: number): void {
        while (parent.children.length > 0) {
            parent.removeChild(parent.children[0]);
        }

        const cap = this._core.capacity;
        const segH = containerHeight / cap;
        const liquidW = parent.getComponent(UITransform)!.width;
        const bottomRadius = (TUBE_WIDTH - LIQUID_INSET * 2) * 0.45;

        colors.forEach((colorId, index) => {
            const liquid = new Node(`Liquid_${index}`);
            liquid.parent = parent;
            liquid.layer = layer;
            const lUt = liquid.addComponent(UITransform);
            lUt.setContentSize(liquidW, segH);
            lUt.setAnchorPoint(0.5, 0);
            liquid.setPosition(0, index * segH, 0);

            const lG = liquid.addComponent(Graphics);
            const colorObj = COLOR_MAP[colorId] ?? new Color(158, 158, 158, 255);
            lG.fillColor = colorObj;

            const x0 = -liquidW * 0.5;
            const isTop = index === colors.length - 1;
            const isBottom = index === 0;

            if (isBottom && isTop && colors.length === 1) {
                lG.roundRect(x0, 0, liquidW, segH, bottomRadius);
                lG.fill();
            } else if (isTop) {
                lG.roundRect(x0, 0, liquidW, segH, 4);
                lG.fill();
            } else if (isBottom) {
                lG.moveTo(x0, bottomRadius);
                lG.lineTo(x0, segH);
                lG.lineTo(x0 + liquidW, segH);
                lG.lineTo(x0 + liquidW, bottomRadius);
                lG.quadraticCurveTo(x0 + liquidW, 0, x0 + liquidW - bottomRadius, 0);
                lG.lineTo(x0 + bottomRadius, 0);
                lG.quadraticCurveTo(x0, 0, x0, bottomRadius);
                lG.close();
                lG.fill();
            } else {
                lG.rect(x0, 0, liquidW, segH);
                lG.fill();
            }

            if (index > 0) {
                lG.strokeColor = new Color(0, 0, 0, 50);
                lG.lineWidth = 1;
                lG.moveTo(x0, 0);
                lG.lineTo(x0 + liquidW, 0);
                lG.stroke();
            }
        });
    }

    private _onTubeClick(tubeNode: Node): void {
        const index = this._tubeIndexMap.get(tubeNode) ?? -1;
        if (index < 0) return;

        if (this._selectedTube === tubeNode) {
            this._deselectTube();
            return;
        }

        if (this._selectedTube) {
            const fromIndex = this._tubeIndexMap.get(this._selectedTube) ?? -1;
            if (fromIndex < 0) {
                this._deselectTube();
                return;
            }

            if (this._core.canPour(fromIndex, index)) {
                this._core.pour(fromIndex, index);
                this._syncTubes();

                if (this._core.isLevelCompleted()) {
                    setTimeout(() => this._onLevelComplete(), 500);
                }
            }

            this._deselectTube();
            return;
        }

        const tube = this._core.tubes[index];
        if (tube.colors.length > 0) {
            this._selectTube(tubeNode);
        }
    }

    private _selectTube(tubeNode: Node): void {
        this._selectedTube = tubeNode;
        const baseY = this._tubeBaseY.get(tubeNode) ?? tubeNode.position.y;
        tween(tubeNode)
            .to(0.15, { position: v3(tubeNode.position.x, baseY + SELECTED_OFFSET, 0) })
            .start();
    }

    private _deselectTube(): void {
        if (!this._selectedTube) return;

        const node = this._selectedTube;
        const baseY = this._tubeBaseY.get(node) ?? node.position.y - SELECTED_OFFSET;
        this._selectedTube = null;

        tween(node)
            .to(0.15, { position: v3(node.position.x, baseY, 0) })
            .start();
    }

    private _syncTubes(): void {
        const tubes = this._core.tubes;
        const { height } = tubeInnerBounds();
        const containerHeight = height + TUBE_BOTTOM_R * 0.5;

        this._tubeNodes.forEach((tubeNode, index) => {
            const tube = tubes[index];
            const liquids = tubeNode.getChildByName('Liquids');
            if (liquids) {
                this._updateTubeLiquids(liquids, tube.colors, this._layer, containerHeight);
            }
        });
    }

    private _mountBottomChrome(parent: Node, layer: number, cw: number, ch: number): void {
        buildGameChromeAdStrip(parent, layer, { cw, label: '广告位' });
        const bottomBtnY = getBottomActionBarCenterY(ch);
        const refs = buildGameChromeActionBar(parent, layer, {
            cw,
            centerY: bottomBtnY,
            slots: [
                GAME_CHROME_SLOTS.home(() => this._exitToLobby()),
                GAME_CHROME_SLOTS.leaderboard(() => this._onLeaderboardClicked()),
                GAME_CHROME_SLOTS.help(() => this._onHelpClicked()),
                GAME_CHROME_SLOTS.refresh(() => this._onRestartClicked()),
                GAME_CHROME_SLOTS.share('pour_water'),
            ],
        });
        loadIconFont(() => refreshGameChromeIconLabels(refs));
    }

    private _onRestartClicked(): void {
        this._deselectTube();
        this._startLevel();
    }

    private _onLeaderboardClicked(): void {
        const parent = this.node.getChildByName('PourWaterRoot');
        if (!parent) {
            return;
        }
        LeaderboardPopup.show(parent);
    }

    private _onHelpClicked(): void {
        const parent = this.node.getChildByName('PourWaterRoot');
        if (!parent) return;
        const helpLines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '将所有试管中的液体分类，使每个试管只有一种颜色' },
            { text: '操作方法', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '点击试管选择，再点击目标试管倒入' },
            { text: '游戏规则', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '只能倒入空试管或顶部颜色相同的试管' },
        ];
        this._showHelpDialog(parent, '游戏帮助', helpLines);
    }

    private _showHelpDialog(
        parent: Node,
        title: string,
        lines: HelpDialogLine[],
        options?: HelpDialogOptions
    ): void {
        GameHelpDialog.show(parent, title, lines, options);
    }

    private _exitToLobby(): void {
        director.loadScene('Lobby');
    }

    private _startLevel(): void {
        if (this._currentLevel >= POUR_WATER_LEVELS.length) {
            this._showWinToast();
            return;
        }

        const level = POUR_WATER_LEVELS[this._currentLevel];
        this._core.startLevel(level);

        if (this._levelLabel) {
            this._levelLabel.string = `关卡: ${this._currentLevel + 1}`;
        }

        this._rebuildTubes();
    }

    private _rebuildTubes(): void {
        const gameArea = this.node.getChildByName('PourWaterRoot')?.getChildByName('GameArea');
        if (!gameArea) return;

        this._selectedTube = null;
        this._tubeIndexMap.clear();
        this._tubeBaseY.clear();

        while (gameArea.children.length > 1) {
            gameArea.removeChild(gameArea.children[1]);
        }

        const gaUt = gameArea.getComponent(UITransform)!;
        this._buildTubes(gameArea, this._layer, gaUt.width, gaUt.height);
    }

    private _onLevelComplete(): void {
        this._currentLevel++;
        this._startLevel();
    }

    private _showWinToast(): void {
        const parent = this.node.getChildByName('PourWaterRoot');
        if (!parent) {
            return;
        }

        GameWinToast.show(
            parent,
            () => {
                this._currentLevel = 0;
                this._startLevel();
            },
            () => this._exitToLobby(),
            {
                subTitle: '已完成全部关卡',
            },
        );
    }
}