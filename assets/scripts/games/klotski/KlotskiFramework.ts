import {
    _decorator,
    Button,
    Color,
    Component,
    EventTouch,
    Graphics,
    Label,
    Node,
    UITransform,
    Vec3,
    director,
} from 'cc';
import { KlotskiCore, KlotskiSize } from './KlotskiCore';
import { applyGlobalLabelFont } from '../../core/LabelFont';
import { KlotskiPageBuilder, BODY, PRIMARY_ACTION_BTN_W, PRIMARY_ACTION_BTN_H, PRIMARY_ACTION_FONT, TILE_BG, TILE_TEXT, EMPTY_BG, NAV_BAR_H } from './KlotskiPageBuilder';
import type { HelpDialogLine } from '../../game/chrome/GameHelpDialog';
import { GameWinToast } from '../../game/chrome/GameWinToast';

const { ccclass } = _decorator;

@ccclass('KlotskiFramework')
export class KlotskiFramework extends KlotskiPageBuilder {
    private _core: KlotskiCore | null = null;
    private _selectedSize: KlotskiSize = 3;
    private _timerLabel: Label | null = null;
    private _timerSeconds: number = 0;
    private _timerInterval: number = 0;
    private _boardNode: Node | null = null;
    private _tileNodes: Node[] = [];
    private _sizeLabel: Label | null = null;
    /** 选关页尺寸下拉按钮上的文案（与 _sizeLabel 分离，避免 _cycleSize 漏更新） */
    private _selectionSizeToggleLabel: Label | null = null;
    private _startBtnNode: Node | null = null;
    private _restartBtnNode: Node | null = null;
    private _selectionPage: Node | null = null;
    private _gamePage: Node | null = null;

    onLoad(): void {
        this._core = new KlotskiCore(this._selectedSize);
        this._buildSelectionPage();
    }

    onDestroy(): void {
        this._stopTimer();
    }

    private _buildSelectionPage(): void {
        const root = this.node;
        const parentTrans = root.parent?.getComponent(UITransform);
        const cw = parentTrans ? parentTrans.width : 720;
        const ch = parentTrans ? parentTrans.height : 1280;

        const wrap = this.buildWrap(root, cw, ch);
        this._selectionPage = this.buildPageNode(wrap, 'SelectionPage', cw, ch);

        const contentTop = ch * 0.5 - NAV_BAR_H - 12;

        this._timerLabel = this.addLabelWithSunkenBg(this._selectionPage, 'Timer', contentTop - 30, 128, 40, '00:00', 22, 28, BODY, Label.HorizontalAlign.CENTER, -cw * 0.5 + 80);
        this.addLabel(this._selectionPage, 'TargetLabel', contentTop - 100, 120, 36, '目标图案', 36, 28, new Color(0, 0, 0, 255), Label.HorizontalAlign.CENTER, 0);

        this._selectionSizeToggleLabel = this._buildSizeToggle(this._selectionPage, wrap.layer, cw, contentTop - 30);

        const { boardSize, boardY, primaryBtnY } = this.computePlayLayout(cw, ch);

        this._drawTargetBoard(this._selectionPage, wrap.layer, 0, boardY, boardSize, this._selectedSize);

        this._startBtnNode = this.addRoundBtn(this._selectionPage, wrap.layer, 0, primaryBtnY, '开始游戏', PRIMARY_ACTION_BTN_W, PRIMARY_ACTION_BTN_H, PRIMARY_ACTION_FONT, () => {
            this._startGame();
        });

        this.mountBottomChrome(this._selectionPage, wrap.layer, cw, ch, () => {
            this._onHelpClicked();
        });
    }

    private _buildGamePage(): void {
        const root = this.node;
        const parentTrans = root.parent?.getComponent(UITransform);
        const cw = parentTrans ? parentTrans.width : 720;
        const ch = parentTrans ? parentTrans.height : 1280;

        const wrap = root.getChildByName('KlotskiRoot');
        this._gamePage = this.buildPageNode(wrap!, 'GamePage', cw, ch);
        this._gamePage.active = false;

        const contentTop = ch * 0.5 - NAV_BAR_H - 12;

        this._timerLabel = this.addLabelWithSunkenBg(this._gamePage, 'Timer', contentTop - 30, 128, 40, '00:00', 22, 28, BODY, Label.HorizontalAlign.CENTER, -cw * 0.5 + 80);
        this._buildSizeToggle(this._gamePage, root.layer, cw, contentTop - 30, () => {
            this._backToSelection();
        }, this._gameSizeLabelText(this._selectedSize));

        const { boardSize, boardY, primaryBtnY } = this.computePlayLayout(cw, ch);

        this._boardNode = new Node('Board');
        this._boardNode.parent = this._gamePage;
        this._boardNode.layer = root.layer;
        const bUt = this._boardNode.addComponent(UITransform);
        bUt.setContentSize(boardSize, boardSize);
        bUt.setAnchorPoint(0.5, 0.5);
        this._boardNode.setPosition(0, boardY, 0);

        this._drawBoard(boardSize, this._selectedSize);

        this._restartBtnNode = this.addRoundBtn(this._gamePage, root.layer, 0, primaryBtnY, '重新开始', PRIMARY_ACTION_BTN_W, PRIMARY_ACTION_BTN_H, PRIMARY_ACTION_FONT, () => {
            this._restartGame();
        });

        this.mountBottomChrome(this._gamePage, root.layer, cw, ch, () => {
            this._onHelpClicked();
        });
    }

    private _buildSizeToggle(parent: Node, layer: number, cw: number, y: number, onClick?: () => void, btnText?: string): Label {
        const labelText = btnText ?? this._selectionSizeLabelText(this._selectedSize);
        return this.buildSizeSelectorChip(
            parent,
            layer,
            cw * 0.5 - 80,
            y,
            labelText,
            () => {
                if (onClick) {
                    onClick();
                } else {
                    this._cycleSize();
                }
            },
        );
    }

    private _selectionSizeLabelText(size: KlotskiSize): string {
        return `${size}×${size} ▾`;
    }

    private _gameSizeLabelText(size: KlotskiSize): string {
        return `${size}×${size} ◄`;
    }

    private _drawTargetBoard(parent: Node, layer: number, x: number, y: number, size: number, gridSize: KlotskiSize): void {
        const boardNode = new Node('TargetBoard');
        boardNode.parent = parent;
        boardNode.layer = layer;
        const bUt = boardNode.addComponent(UITransform);
        bUt.setContentSize(size, size);
        bUt.setAnchorPoint(0.5, 0.5);
        boardNode.setPosition(x, y, 0);

        const frameG = boardNode.addComponent(Graphics);
        frameG.fillColor = new Color(139, 90, 43, 255);
        frameG.rect(-size * 0.5, -size * 0.5, size, size);
        frameG.fill();

        const padding = 8;
        const innerSize = size - padding * 2;
        const cellSize = innerSize / gridSize;
        const gap = 3;

        const total = gridSize * gridSize;
        for (let i = 0; i < total; i++) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const value = i + 1;
            const isEmpty = value === total;

            const cellX = -innerSize * 0.5 + col * cellSize + cellSize * 0.5;
            const cellY = innerSize * 0.5 - row * cellSize - cellSize * 0.5;

            const cellNode = new Node(`Cell_${i}`);
            cellNode.parent = boardNode;
            cellNode.layer = layer;
            const cUt = cellNode.addComponent(UITransform);
            cUt.setContentSize(cellSize - gap, cellSize - gap);
            cUt.setAnchorPoint(0.5, 0.5);
            cellNode.setPosition(cellX, cellY, 0);

            const cG = cellNode.addComponent(Graphics);
            if (isEmpty) {
                cG.fillColor = EMPTY_BG;
            } else {
                cG.fillColor = TILE_BG;
            }
            cG.roundRect(-(cellSize - gap) * 0.5, -(cellSize - gap) * 0.5, cellSize - gap, cellSize - gap, 6);
            cG.fill();

            if (!isEmpty) {
                const lbNode = new Node(`Label_${i}`);
                lbNode.parent = cellNode;
                lbNode.layer = layer;
                const lbUt = lbNode.addComponent(UITransform);
                lbUt.setContentSize(cellSize - gap, cellSize - gap);
                lbUt.setAnchorPoint(0.5, 0.5);
                const lb = lbNode.addComponent(Label);
                lb.string = `${value}`;
                lb.fontSize = cellSize * 0.45;
                lb.lineHeight = Math.ceil(cellSize * 0.45 * 1.15);
                lb.color = TILE_TEXT;
                lb.horizontalAlign = Label.HorizontalAlign.CENTER;
                lb.verticalAlign = Label.VerticalAlign.CENTER;
                applyGlobalLabelFont(lb);
            }
        }
    }

    private _drawBoard(boardSize: number, gridSize: KlotskiSize): void {
        for (const tn of this._tileNodes) {
            tn.destroy();
        }
        this._tileNodes = [];

        if (!this._boardNode || !this._core) return;

        const padding = 8;
        const innerSize = boardSize - padding * 2;
        const cellSize = innerSize / gridSize;
        const gap = 3;

        const frameG = this._boardNode.getComponent(Graphics);
        if (!frameG) {
            const g = this._boardNode.addComponent(Graphics);
            g.fillColor = new Color(139, 90, 43, 255);
            g.rect(-boardSize * 0.5, -boardSize * 0.5, boardSize, boardSize);
            g.fill();
        } else {
            frameG.clear();
            frameG.fillColor = new Color(139, 90, 43, 255);
            frameG.rect(-boardSize * 0.5, -boardSize * 0.5, boardSize, boardSize);
            frameG.fill();
        }

        const total = gridSize * gridSize;
        for (let i = 0; i < total; i++) {
            const value = this._core.board.tiles[i];
            const isEmpty = value === 0;

            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            const cellX = -innerSize * 0.5 + col * cellSize + cellSize * 0.5;
            const cellY = innerSize * 0.5 - row * cellSize - cellSize * 0.5;

            const cellNode = new Node(`Tile_${i}`);
            cellNode.parent = this._boardNode;
            cellNode.layer = this._boardNode.layer;
            const cUt = cellNode.addComponent(UITransform);
            cUt.setContentSize(cellSize - gap, cellSize - gap);
            cUt.setAnchorPoint(0.5, 0.5);
            cellNode.setPosition(cellX, cellY, 0);

            const cG = cellNode.addComponent(Graphics);
            if (isEmpty) {
                cG.fillColor = EMPTY_BG;
            } else {
                cG.fillColor = TILE_BG;
            }
            cG.roundRect(-(cellSize - gap) * 0.5, -(cellSize - gap) * 0.5, cellSize - gap, cellSize - gap, 6);
            cG.fill();

            if (!isEmpty) {
                const lbNode = new Node(`Label_${i}`);
                lbNode.parent = cellNode;
                lbNode.layer = cellNode.layer;
                const lbUt = lbNode.addComponent(UITransform);
                lbUt.setContentSize(cellSize - gap, cellSize - gap);
                lbUt.setAnchorPoint(0.5, 0.5);
                const lb = lbNode.addComponent(Label);
                lb.string = `${value}`;
                lb.fontSize = cellSize * 0.45;
                lb.lineHeight = Math.ceil(cellSize * 0.45 * 1.15);
                lb.color = TILE_TEXT;
                lb.horizontalAlign = Label.HorizontalAlign.CENTER;
                lb.verticalAlign = Label.VerticalAlign.CENTER;
                applyGlobalLabelFont(lb);
            }

            if (!isEmpty) {
                const hitNode = new Node(`Hit_${i}`);
                hitNode.parent = cellNode;
                hitNode.layer = cellNode.layer;
                hitNode.setSiblingIndex(cellNode.children.length - 1);
                const hitUt = hitNode.addComponent(UITransform);
                hitUt.setContentSize(cellSize - gap, cellSize - gap);
                hitUt.setAnchorPoint(0.5, 0.5);

                let touchStartPos: Vec3 | null = null;
                hitNode.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
                    touchStartPos = new Vec3(event.getUILocation().x, event.getUILocation().y, 0);
                }, this);
                const finishTouch = (event: EventTouch) => {
                    if (!touchStartPos) return;
                    const start = touchStartPos;
                    touchStartPos = null;
                    this._applyTileTouchInput(i, event, start);
                };
                hitNode.on(Node.EventType.TOUCH_END, finishTouch, this);
                hitNode.on(Node.EventType.TOUCH_CANCEL, finishTouch, this);
            }

            this._tileNodes.push(cellNode);
        }
    }

    private _onTileClick(tileIndex: number): void {
        if (!this._core) return;
        if (this._core.tryMove(tileIndex)) {
            this._updateBoardDisplay();
            if (this._core.isSolved) {
                this._stopTimer();
                this._showWinToast();
            }
        }
    }

    private _applyTileTouchInput(tileIndex: number, event: EventTouch, start: Vec3): void {
        if (!this._core) return;
        const end = event.getUILocation();
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const tapThreshold = 15;

        if (dist < tapThreshold) {
            this._onTileClick(tileIndex);
            return;
        }

        const size = this._core.board.size;
        const row = Math.floor(tileIndex / size);
        const col = tileIndex % size;
        let neighborIndex = -1;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && col < size - 1) neighborIndex = tileIndex + 1;
            else if (dx < 0 && col > 0) neighborIndex = tileIndex - 1;
        } else {
            if (dy > 0 && row > 0) neighborIndex = tileIndex - size;
            else if (dy < 0 && row < size - 1) neighborIndex = tileIndex + size;
        }

        if (neighborIndex >= 0 && this._core.board.tiles[neighborIndex] === 0) {
            this._onTileClick(tileIndex);
        }
    }

    private _updateBoardDisplay(): void {
        if (!this._boardNode || !this._core) return;
        const boardSize = this._boardNode.getComponent(UITransform)!.width;
        this._drawBoard(boardSize, this._core.board.size as KlotskiSize);
    }

    private _startGame(): void {
        if (!this._core) return;
        this._core = new KlotskiCore(this._selectedSize);
        this._core.shuffle();
        this._timerSeconds = 0;
        this._startTimer();

        if (!this._gamePage) {
            this._buildGamePage();
        }
        this._selectionPage!.active = false;
        this._gamePage!.active = true;
        this._updateBoardDisplay();
    }

    private _restartGame(): void {
        if (!this._core) return;
        this._core.restart();
        this._timerSeconds = 0;
        this._startTimer();
        this._updateBoardDisplay();
    }

    private _backToSelection(): void {
        this._stopTimer();
        if (this._gamePage) {
            this._gamePage.destroy();
            this._gamePage = null;
            this._tileNodes = [];
            this._boardNode = null;
        }
        this._selectionPage!.active = true;
        this._core = new KlotskiCore(this._selectedSize);
        // 更新选择界面的按钮文本
        if (this._selectionSizeToggleLabel) {
            this._selectionSizeToggleLabel.string = this._selectionSizeLabelText(this._selectedSize);
        }
    }

    private _cycleSize(): void {
        const sizes: KlotskiSize[] = [3, 4, 5];
        const idx = sizes.indexOf(this._selectedSize);
        this._selectedSize = sizes[(idx + 1) % sizes.length];
        if (this._selectionSizeToggleLabel) {
            this._selectionSizeToggleLabel.string = this._selectionSizeLabelText(this._selectedSize);
        }
        if (this._sizeLabel) {
            this._sizeLabel.string = `${this._selectedSize}*${this._selectedSize}`;
        }
        if (this._core) {
            this._core = new KlotskiCore(this._selectedSize);
        }
        this._refreshTargetBoard();
    }

    private _refreshTargetBoard(): void {
        if (!this._selectionPage) return;
        const targetBoard = this._selectionPage.getChildByName('TargetBoard');
        if (targetBoard) {
            targetBoard.destroy();
        }
        const cw = this._selectionPage.getComponent(UITransform)!.width;
        const ch = this._selectionPage.getComponent(UITransform)!.height;
        const { boardSize, boardY } = this.computePlayLayout(cw, ch);
        this._drawTargetBoard(this._selectionPage, this._selectionPage.layer, 0, boardY, boardSize, this._selectedSize);
    }

    private _startTimer(): void {
        this._stopTimer();
        this._timerInterval = setInterval(() => {
            this._timerSeconds++;
            if (this._timerLabel) {
                this._timerLabel.string = this._formatTime(this._timerSeconds);
            }
        }, 1000);
    }

    private _stopTimer(): void {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = 0;
        }
    }

    private _onHelpClicked(): void {
        const parent = this._gamePage || this._selectionPage;
        if (!parent) return;

        const lines: HelpDialogLine[] = [
            { text: '游戏目标', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '将所有数字方块按照 1、2、3... 的顺序排列到对应位置' },
            { text: '操作方法', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '点击或滑动数字方块，使其滑动到相邻的空位' },
            { text: '通过不断移动，最终将数字方块按顺序排列' },
            { text: '游戏技巧', fontSize: 18, color: new Color(255, 189, 0, 255), lineHeight: 28 },
            { text: '先确定数字1的位置，然后依次排列后续数字' },
            { text: '注意利用空位来移动方块，不要急于求成' },
        ];

        this.showHelpDialog(parent, '华容道游戏说明', lines);
    }

    private _showWinToast(): void {
        const parent = this.node.getChildByName('KlotskiRoot');
        if (!parent) {
            return;
        }

        GameWinToast.show(
            parent,
            () => this._restartGame(),
            () => director.loadScene('Lobby'),
            {
                subTitle: `用时 ${this._timerSeconds} 秒`,
                retryLabel: '重新开始',
            },
        );
    }

    private _formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}