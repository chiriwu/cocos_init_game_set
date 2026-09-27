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

export interface LeaderboardEntry {
    rank: number;
    nickname: string;
    level: number;
    /** 用时（秒） */
    timeSeconds: number;
    /** 无头像资源时用色块占位 */
    avatarColor?: Color;
}

export interface LeaderboardData {
    entries: LeaderboardEntry[];
    self?: LeaderboardEntry;
    /** 懒加载时：当前 entries 之后是否还有更多 */
    hasMore?: boolean;
}

export interface LeaderboardLoadParams {
    /** 当前已加载条数，从 0 开始 */
    offset: number;
    limit: number;
}

export interface LeaderboardLoadResult {
    entries: LeaderboardEntry[];
    hasMore: boolean;
}

export interface LeaderboardPopupOptions {
    boxWidth?: number;
    boxHeight?: number;
    overlayColor?: Color;
    overlayAlpha?: number;
    /** 每页条数，默认 20 */
    pageSize?: number;
    /** 距底部多少像素触发加载下一页，默认 80 */
    loadThreshold?: number;
    /**
     * 懒加载回调：offset 为当前已加载条数。
     * 传入后列表可滚动，并在接近底部时自动请求下一页。
     */
    onLoadMore?: (params: LeaderboardLoadParams) => Promise<LeaderboardLoadResult>;
}

const BOX_BG = new Color(255, 244, 224, 255);
const BOX_BORDER = new Color(139, 90, 43, 255);
const HEADER_BG = new Color(245, 230, 200, 255);
const TITLE_COLOR = new Color(139, 90, 43, 255);
const HEADER_TEXT = new Color(120, 98, 78, 255);
const BODY_TEXT = new Color(72, 58, 46, 255);
const ROW_LINE = new Color(220, 200, 170, 180);
const SELF_ROW_BG = new Color(250, 215, 160, 255);
const DEFAULT_OVERLAY = new Color(0, 0, 0, 150);

const ROW_H = 52;
const AVATAR_SIZE = 34;

const RANK_TOP_COLORS = [
    new Color(232, 146, 74, 255),
    new Color(107, 143, 163, 255),
    new Color(201, 123, 90, 255),
];

const DEFAULT_AVATAR_COLORS = [
    new Color(255, 182, 193, 255),
    new Color(176, 224, 230, 255),
    new Color(255, 218, 185, 255),
    new Color(221, 160, 221, 255),
];

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_LOAD_THRESHOLD = 80;
const MOCK_TOTAL_RANKS = 100;

class LeaderboardScrollSession {
    private _entries: LeaderboardEntry[] = [];
    private _hasMore = false;
    private _loading = false;
    private _listW = 0;
    private _listH = 0;
    private _pageSize = DEFAULT_PAGE_SIZE;
    private _loadThreshold = DEFAULT_LOAD_THRESHOLD;
    private _onLoadMore?: (params: LeaderboardLoadParams) => Promise<LeaderboardLoadResult>;
    private _scroll: ScrollView | null = null;
    private _content: Node | null = null;
    private _contentUt: UITransform | null = null;
    private _footer: Node | null = null;
    private _footerLabel: Label | null = null;
    private _alive = true;

    constructor(
        scroll: ScrollView,
        content: Node,
        listW: number,
        listH: number,
        options?: LeaderboardPopupOptions,
    ) {
        this._scroll = scroll;
        this._content = content;
        this._contentUt = content.getComponent(UITransform);
        this._listW = listW;
        this._listH = listH;
        this._pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
        this._loadThreshold = options?.loadThreshold ?? DEFAULT_LOAD_THRESHOLD;
        this._onLoadMore = options?.onLoadMore;

        this._footer = new Node('ListFooter');
        this._footer.parent = content;
        this._footer.layer = content.layer;
        const footerUt = this._footer.addComponent(UITransform);
        footerUt.setContentSize(listW, ROW_H);
        footerUt.setAnchorPoint(0.5, 0.5);
        this._footer.active = false;

        const footerLbNode = new Node('FooterLabel');
        footerLbNode.parent = this._footer;
        footerLbNode.layer = content.layer;
        const lbUt = footerLbNode.addComponent(UITransform);
        lbUt.setContentSize(listW, ROW_H);
        lbUt.setAnchorPoint(0.5, 0.5);
        this._footerLabel = footerLbNode.addComponent(Label);
        this._footerLabel.fontSize = 15;
        this._footerLabel.lineHeight = 20;
        this._footerLabel.color = HEADER_TEXT;
        this._footerLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this._footerLabel.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(this._footerLabel);

        scroll.node.on(ScrollView.EventType.SCROLLING, this._onScrolling, this);
    }

    public destroy(): void {
        this._alive = false;
        if (this._scroll?.node?.isValid) {
            this._scroll.node.off(ScrollView.EventType.SCROLLING, this._onScrolling, this);
        }
    }

    public async start(initialEntries: LeaderboardEntry[], hasMore: boolean): Promise<void> {
        this._entries = [...initialEntries];
        this._hasMore = hasMore;
        this._renderAll();

        if (this._entries.length === 0 && this._onLoadMore) {
            await this._loadNextPage();
        }
    }

    private _onScrolling(): void {
        if (!this._alive || !this._scroll || !this._onLoadMore || this._loading || !this._hasMore) {
            return;
        }
        const maxY = this._scroll.getMaxScrollOffset().y;
        if (maxY <= 0) {
            return;
        }
        const offsetY = this._scroll.getScrollOffset().y;
        if (offsetY >= maxY - this._loadThreshold) {
            void this._loadNextPage();
        }
    }

    private async _loadNextPage(): Promise<void> {
        if (!this._alive || !this._onLoadMore || this._loading || !this._hasMore) {
            return;
        }
        this._loading = true;
        this._setFooter('加载中...', true);

        try {
            const result = await this._onLoadMore({
                offset: this._entries.length,
                limit: this._pageSize,
            });
            if (!this._alive || !this._content?.isValid) {
                return;
            }
            if (result.entries.length > 0) {
                this._appendEntries(result.entries);
            }
            this._hasMore = result.hasMore;
            this._syncFooter();
        } catch {
            if (this._alive) {
                this._setFooter('加载失败，继续下滑重试', true);
            }
        } finally {
            this._loading = false;
        }
    }

    private _appendEntries(entries: LeaderboardEntry[]): void {
        const startIndex = this._entries.length;
        this._entries.push(...entries);
        this._updateContentHeight();

        if (startIndex > 0) {
            const prevLast = this._content!.getChildByName(`Row_${startIndex - 1}`);
            LeaderboardPopup.setRowSeparator(prevLast, this._listW, true);
        }

        for (let i = 0; i < entries.length; i++) {
            const index = startIndex + i;
            const rowY = -index * ROW_H - ROW_H * 0.5;
            LeaderboardPopup.addRow(this._content!, this._listW, rowY, entries[i], {
                highlight: false,
                showSeparator: index < this._entries.length - 1,
                rowKey: `Row_${index}`,
            });
        }
        this._positionFooter();
    }

    private _renderAll(): void {
        if (!this._content?.isValid) {
            return;
        }
        for (const child of [...this._content.children]) {
            if (child !== this._footer) {
                child.destroy();
            }
        }

        this._updateContentHeight();
        for (let i = 0; i < this._entries.length; i++) {
            const rowY = -i * ROW_H - ROW_H * 0.5;
            LeaderboardPopup.addRow(this._content, this._listW, rowY, this._entries[i], {
                highlight: false,
                showSeparator: i < this._entries.length - 1,
                rowKey: `Row_${i}`,
            });
        }
        this._syncFooter();
    }

    private _updateContentHeight(): void {
        if (!this._contentUt) {
            return;
        }
        const rowsH = Math.max(this._entries.length, 1) * ROW_H;
        const footerH = this._footer?.active ? ROW_H : 0;
        const contentH = Math.max(this._listH, rowsH + footerH);
        this._contentUt.setContentSize(this._listW, contentH);
        this._positionFooter();
    }

    private _positionFooter(): void {
        if (!this._footer) {
            return;
        }
        this._footer.setPosition(0, -this._entries.length * ROW_H - ROW_H * 0.5, 0);
    }

    private _syncFooter(): void {
        if (!this._onLoadMore) {
            this._setFooter('', false);
            return;
        }
        if (this._loading) {
            this._setFooter('加载中...', true);
            return;
        }
        if (this._hasMore) {
            this._setFooter('上滑加载更多', this._entries.length >= this._pageSize);
            return;
        }
        this._setFooter(this._entries.length > 0 ? '没有更多了' : '暂无数据', this._entries.length > 0);
    }

    private _setFooter(text: string, visible: boolean): void {
        if (!this._footer || !this._footerLabel) {
            return;
        }
        this._footer.active = visible;
        this._footerLabel.string = text;
        this._updateContentHeight();
    }
}

export class LeaderboardPopup {
    private static _activeDialog: Node | null = null;
    private static _activeSession: LeaderboardScrollSession | null = null;

    public static dismiss(): void {
        if (this._activeSession) {
            this._activeSession.destroy();
            this._activeSession = null;
        }
        if (this._activeDialog?.isValid) {
            this._activeDialog.destroy();
        }
        this._activeDialog = null;
    }

    public static show(
        parent: Node,
        data?: LeaderboardData,
        options?: LeaderboardPopupOptions,
    ): void {
        if (this._activeDialog?.isValid) {
            return;
        }

        const useLazyLoad = !!options?.onLoadMore;
        const payload = data ?? (useLazyLoad
            ? LeaderboardPopup.mockFirstPage(options?.pageSize ?? DEFAULT_PAGE_SIZE)
            : LeaderboardPopup.mockData());
        const pageUt = parent.getComponent(UITransform);
        const cw = pageUt?.width ?? parent.parent?.getComponent(UITransform)?.width ?? 720;
        const ch = pageUt?.height ?? parent.parent?.getComponent(UITransform)?.height ?? 1280;

        const dialog = new Node('LeaderboardPopup');
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

        const boxW = options?.boxWidth ?? Math.min(cw - 48, 620);
        const boxH = options?.boxHeight ?? Math.min(ch * 0.72, 680);
        const headerH = 72;
        const tableHeaderH = 34;
        const selfRowH = ROW_H;
        const innerPad = 16;
        const listH = boxH - headerH - tableHeaderH - selfRowH - innerPad;

        const panel = new Node('Panel');
        panel.parent = dialog;
        panel.layer = parent.layer;
        panel.setPosition(0, 24, 0);
        const panelUt = panel.addComponent(UITransform);
        panelUt.setContentSize(boxW, boxH + 56);
        panelUt.setAnchorPoint(0.5, 0.5);

        const box = new Node('Box');
        box.parent = panel;
        box.layer = parent.layer;
        box.setPosition(0, 28, 0);
        const bUt = box.addComponent(UITransform);
        bUt.setContentSize(boxW, boxH);
        bUt.setAnchorPoint(0.5, 0.5);

        LeaderboardPopup.drawBoxBackground(box, boxW, boxH);
        LeaderboardPopup.drawHeaderBanner(box, boxW, boxH, headerH);
        LeaderboardPopup.addTitle(box, boxW, boxH, headerH);

        const listW = boxW - 24;
        const listTopY = boxH * 0.5 - headerH - 8;

        LeaderboardPopup.addTableHeader(box, listW, listTopY, tableHeaderH);

        const scrollTopY = listTopY - tableHeaderH;
        const session = LeaderboardPopup.buildScrollList(
            box,
            listW,
            listH,
            scrollTopY,
            payload.entries,
            options,
        );
        this._activeSession = session;
        void session.start(
            payload.entries,
            payload.hasMore ?? !!options?.onLoadMore,
        );

        if (payload.self) {
            const selfY = -boxH * 0.5 + selfRowH * 0.5 + 8;
            LeaderboardPopup.addRow(box, listW, selfY, payload.self, {
                highlight: true,
                showSeparator: false,
            });
        }

        LeaderboardPopup.addCloseButton(panel, boxH, () => LeaderboardPopup.dismiss());
    }

    /** 静态演示数据（无懒加载） */
    public static mockData(): LeaderboardData {
        return {
            entries: LeaderboardPopup.buildMockEntries(1, 4),
            self: LeaderboardPopup.mockSelfEntry(),
        };
    }

    /** 懒加载演示：第一页 */
    public static mockFirstPage(pageSize = DEFAULT_PAGE_SIZE): LeaderboardData {
        return {
            entries: LeaderboardPopup.buildMockEntries(1, pageSize),
            self: LeaderboardPopup.mockSelfEntry(),
            hasMore: pageSize < MOCK_TOTAL_RANKS,
        };
    }

    /** 懒加载演示：模拟请求下一页 */
    public static mockLoadMore(params: LeaderboardLoadParams): Promise<LeaderboardLoadResult> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const startRank = params.offset + 1;
                if (startRank > MOCK_TOTAL_RANKS) {
                    resolve({ entries: [], hasMore: false });
                    return;
                }
                const endRank = Math.min(startRank + params.limit - 1, MOCK_TOTAL_RANKS);
                resolve({
                    entries: LeaderboardPopup.buildMockEntries(startRank, endRank),
                    hasMore: endRank < MOCK_TOTAL_RANKS,
                });
            }, 400);
        });
    }

    private static mockSelfEntry(): LeaderboardEntry {
        return {
            rank: 34643,
            nickname: '李狗蛋',
            level: 5,
            timeSeconds: 41.269,
            avatarColor: new Color(255, 200, 120, 255),
        };
    }

    private static buildMockEntries(startRank: number, endRank: number): LeaderboardEntry[] {
        const entries: LeaderboardEntry[] = [];
        for (let rank = startRank; rank <= endRank; rank++) {
            entries.push({
                rank,
                nickname: rank <= 3 ? `李🐶蛋${rank}` : `玩家${rank}`,
                level: Math.max(1, 1000 - rank),
                timeSeconds: 3616.337 + rank * 0.01,
                avatarColor: DEFAULT_AVATAR_COLORS[rank % DEFAULT_AVATAR_COLORS.length],
            });
        }
        return entries;
    }

    private static drawBoxBackground(box: Node, boxW: number, boxH: number): void {
        const bgNode = new Node('BoxBg');
        bgNode.parent = box;
        bgNode.layer = box.layer;
        bgNode.setPosition(0, 0, 0);
        const bgUt = bgNode.addComponent(UITransform);
        bgUt.setContentSize(boxW, boxH);
        bgUt.setAnchorPoint(0.5, 0.5);

        const g = bgNode.addComponent(Graphics);
        const x = -boxW * 0.5;
        const y = -boxH * 0.5;
        const r = 18;

        g.fillColor = BOX_BG;
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

        g.lineWidth = 2;
        g.strokeColor = BOX_BORDER;
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

    private static drawHeaderBanner(box: Node, boxW: number, boxH: number, headerH: number): void {
        const banner = new Node('HeaderBanner');
        banner.parent = box;
        banner.layer = box.layer;
        const topY = boxH * 0.5;
        banner.setPosition(0, topY - headerH * 0.5, 0);

        const bUt = banner.addComponent(UITransform);
        bUt.setContentSize(boxW - 4, headerH);
        bUt.setAnchorPoint(0.5, 0.5);

        const g = banner.addComponent(Graphics);
        const w = boxW - 4;
        const h = headerH;
        const x = -w * 0.5;
        const y = -h * 0.5;
        const scallop = 10;

        g.fillColor = HEADER_BG;
        g.moveTo(x, y);
        g.lineTo(x + w, y);
        g.lineTo(x + w, y + h - scallop);
        g.quadraticCurveTo(x + w * 0.75, y + h + scallop * 0.6, x + w * 0.5, y + h - scallop * 0.2);
        g.quadraticCurveTo(x + w * 0.25, y + h + scallop * 0.6, x, y + h - scallop);
        g.close();
        g.fill();
    }

    private static addTitle(box: Node, boxW: number, boxH: number, headerH: number): void {
        const titleNode = new Node('Title');
        titleNode.parent = box;
        titleNode.layer = box.layer;
        titleNode.setPosition(0, boxH * 0.5 - headerH * 0.5 + 2, 0);
        const tUt = titleNode.addComponent(UITransform);
        tUt.setContentSize(boxW - 40, headerH);
        tUt.setAnchorPoint(0.5, 0.5);
        const tLb = titleNode.addComponent(Label);
        tLb.string = '排行榜';
        tLb.fontSize = 28;
        tLb.lineHeight = 36;
        tLb.color = TITLE_COLOR;
        tLb.horizontalAlign = Label.HorizontalAlign.CENTER;
        tLb.verticalAlign = Label.VerticalAlign.CENTER;
        applyGlobalLabelFont(tLb);
    }

    private static addTableHeader(box: Node, listW: number, topY: number, height: number): void {
        const header = new Node('TableHeader');
        header.parent = box;
        header.layer = box.layer;
        header.setPosition(0, topY - height * 0.5, 0);
        const hUt = header.addComponent(UITransform);
        hUt.setContentSize(listW, height);
        hUt.setAnchorPoint(0.5, 0.5);

        const cols = LeaderboardPopup.columnLayout(listW);
        LeaderboardPopup.addCellLabel(header, '排名', cols.rankX, cols.rankW, height, 16, HEADER_TEXT, Label.HorizontalAlign.CENTER);
        LeaderboardPopup.addCellLabel(header, '玩家信息', cols.playerX, cols.playerW, height, 16, HEADER_TEXT, Label.HorizontalAlign.LEFT);
        LeaderboardPopup.addCellLabel(header, '关卡', cols.levelX, cols.levelW, height, 16, HEADER_TEXT, Label.HorizontalAlign.CENTER);
        LeaderboardPopup.addCellLabel(header, '用时', cols.timeX, cols.timeW, height, 16, HEADER_TEXT, Label.HorizontalAlign.CENTER);
    }

    private static buildScrollList(
        box: Node,
        listW: number,
        listH: number,
        topY: number,
        entries: LeaderboardEntry[],
        options?: LeaderboardPopupOptions,
    ): LeaderboardScrollSession {
        const scrollNode = new Node('RankScroll');
        scrollNode.parent = box;
        scrollNode.layer = box.layer;
        scrollNode.setPosition(0, topY - listH * 0.5, 0);
        const scrollUt = scrollNode.addComponent(UITransform);
        scrollUt.setContentSize(listW, listH);
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
        viewUt.setContentSize(listW, listH);
        viewUt.setAnchorPoint(0.5, 0.5);
        viewNode.setPosition(0, 0, 0);
        viewNode.addComponent(Mask);

        const contentH = Math.max(listH, entries.length * ROW_H);
        const content = new Node('content');
        content.parent = viewNode;
        content.layer = box.layer;
        const contentUt = content.addComponent(UITransform);
        contentUt.setContentSize(listW, contentH);
        contentUt.setAnchorPoint(0.5, 1);
        content.setPosition(0, listH * 0.5, 0);
        scroll.content = content;

        return new LeaderboardScrollSession(scroll, content, listW, listH, options);
    }

    static setRowSeparator(row: Node | null, listW: number, visible: boolean): void {
        if (!row?.isValid) {
            return;
        }
        let sep = row.getChildByName('Sep');
        if (visible) {
            if (!sep) {
                sep = new Node('Sep');
                sep.parent = row;
                sep.layer = row.layer;
                sep.setPosition(0, -ROW_H * 0.5 + 0.5, 0);
                const lineUt = sep.addComponent(UITransform);
                lineUt.setContentSize(listW - 8, 1);
                lineUt.setAnchorPoint(0.5, 0.5);
                const lg = sep.addComponent(Graphics);
                lg.fillColor = ROW_LINE;
                lg.rect(-(listW - 8) * 0.5, -0.5, listW - 8, 1);
                lg.fill();
            }
            sep.active = true;
            return;
        }
        if (sep) {
            sep.active = false;
        }
    }

    static addRow(
        parent: Node,
        listW: number,
        y: number,
        entry: LeaderboardEntry,
        opts: { highlight: boolean; showSeparator: boolean; rowKey?: string },
    ): void {
        const row = new Node(opts.rowKey ?? `Row_${entry.rank}`);
        row.parent = parent;
        row.layer = parent.layer;
        row.setPosition(0, y, 0);
        const rowUt = row.addComponent(UITransform);
        rowUt.setContentSize(listW, ROW_H);
        rowUt.setAnchorPoint(0.5, 0.5);

        if (opts.highlight) {
            const bg = row.addComponent(Graphics);
            bg.fillColor = SELF_ROW_BG;
            bg.roundRect(-listW * 0.5, -ROW_H * 0.5, listW, ROW_H, 6);
            bg.fill();
        }

        const cols = LeaderboardPopup.columnLayout(listW);
        const rankColor = LeaderboardPopup.rankColor(entry.rank);
        const rankFontSize = entry.rank <= 3 ? 22 : 18;
        LeaderboardPopup.addCellLabel(
            row,
            `${entry.rank}`,
            cols.rankX,
            cols.rankW,
            ROW_H,
            rankFontSize,
            rankColor,
            Label.HorizontalAlign.CENTER,
        );

        LeaderboardPopup.addPlayerCell(row, entry, cols.playerX, cols.playerW, ROW_H);
        LeaderboardPopup.addCellLabel(
            row,
            `${entry.level}`,
            cols.levelX,
            cols.levelW,
            ROW_H,
            18,
            BODY_TEXT,
            Label.HorizontalAlign.CENTER,
        );
        LeaderboardPopup.addCellLabel(
            row,
            `${entry.timeSeconds.toFixed(3)}秒`,
            cols.timeX,
            cols.timeW,
            ROW_H,
            16,
            BODY_TEXT,
            Label.HorizontalAlign.CENTER,
        );

        LeaderboardPopup.setRowSeparator(row, listW, opts.showSeparator);
    }

    private static addPlayerCell(
        row: Node,
        entry: LeaderboardEntry,
        x: number,
        width: number,
        height: number,
    ): void {
        const cell = new Node('Player');
        cell.parent = row;
        cell.layer = row.layer;
        cell.setPosition(x + width * 0.5 - row.getComponent(UITransform)!.width * 0.5, 0, 0);
        const cellUt = cell.addComponent(UITransform);
        cellUt.setContentSize(width, height);
        cellUt.setAnchorPoint(0, 0.5);

        const avatarColor = entry.avatarColor ?? DEFAULT_AVATAR_COLORS[entry.rank % DEFAULT_AVATAR_COLORS.length];
        const avatar = new Node('Avatar');
        avatar.parent = cell;
        avatar.layer = cell.layer;
        avatar.setPosition(4, 0, 0);
        const aUt = avatar.addComponent(UITransform);
        aUt.setContentSize(AVATAR_SIZE, AVATAR_SIZE);
        aUt.setAnchorPoint(0, 0.5);
        const ag = avatar.addComponent(Graphics);
        ag.fillColor = avatarColor;
        ag.roundRect(0, -AVATAR_SIZE * 0.5, AVATAR_SIZE, AVATAR_SIZE, 6);
        ag.fill();
        ag.lineWidth = 1;
        ag.strokeColor = new Color(180, 150, 120, 255);
        ag.roundRect(0, -AVATAR_SIZE * 0.5, AVATAR_SIZE, AVATAR_SIZE, 6);
        ag.stroke();

        const nameNode = new Node('Name');
        nameNode.parent = cell;
        nameNode.layer = cell.layer;
        nameNode.setPosition(4 + AVATAR_SIZE + 8, 0, 0);
        const nUt = nameNode.addComponent(UITransform);
        nUt.setContentSize(width - AVATAR_SIZE - 16, height);
        nUt.setAnchorPoint(0, 0.5);
        const nLb = nameNode.addComponent(Label);
        nLb.string = entry.nickname;
        nLb.fontSize = 17;
        nLb.lineHeight = 22;
        nLb.color = BODY_TEXT;
        nLb.horizontalAlign = Label.HorizontalAlign.LEFT;
        nLb.verticalAlign = Label.VerticalAlign.CENTER;
        nLb.overflow = Label.Overflow.CLAMP;
        applyGlobalLabelFont(nLb);
    }

    private static addCellLabel(
        parent: Node,
        text: string,
        x: number,
        width: number,
        height: number,
        fontSize: number,
        color: Color,
        align: number,
    ): void {
        const parentW = parent.getComponent(UITransform)!.width;
        const node = new Node('Cell');
        node.parent = parent;
        node.layer = parent.layer;
        node.setPosition(x + width * 0.5 - parentW * 0.5, 0, 0);
        const ut = node.addComponent(UITransform);
        ut.setContentSize(width, height);
        ut.setAnchorPoint(0.5, 0.5);
        const lb = node.addComponent(Label);
        lb.string = text;
        lb.fontSize = fontSize;
        lb.lineHeight = fontSize + 6;
        lb.color = color;
        lb.horizontalAlign = align;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        lb.overflow = Label.Overflow.CLAMP;
        applyGlobalLabelFont(lb);
    }

    private static columnLayout(listW: number): {
        rankX: number;
        rankW: number;
        playerX: number;
        playerW: number;
        levelX: number;
        levelW: number;
        timeX: number;
        timeW: number;
    } {
        const rankW = 56;
        const levelW = 64;
        const timeW = 108;
        const playerW = listW - rankW - levelW - timeW;
        return {
            rankX: 0,
            rankW,
            playerX: rankW,
            playerW,
            levelX: rankW + playerW,
            levelW,
            timeX: rankW + playerW + levelW,
            timeW,
        };
    }

    private static rankColor(rank: number): Color {
        if (rank >= 1 && rank <= 3) {
            return RANK_TOP_COLORS[rank - 1];
        }
        return BODY_TEXT;
    }

    private static addCloseButton(panel: Node, boxH: number, onClick: () => void): void {
        const btnSize = 44;
        const closeBtn = new Node('CloseBtn');
        closeBtn.parent = panel;
        closeBtn.layer = panel.layer;
        closeBtn.setPosition(0, -boxH * 0.5 - 8, 0);
        const ut = closeBtn.addComponent(UITransform);
        ut.setContentSize(btnSize, btnSize);
        ut.setAnchorPoint(0.5, 0.5);

        const g = closeBtn.addComponent(Graphics);
        g.fillColor = new Color(235, 60, 60, 255);
        g.circle(0, 0, btnSize * 0.5);
        g.fill();
        LeaderboardPopup.drawCloseCross(g, Color.WHITE);

        const btn = closeBtn.addComponent(Button);
        btn.transition = Button.Transition.NONE;
        closeBtn.on(Button.EventType.CLICK, onClick, closeBtn);
    }

    private static drawCloseCross(g: Graphics, color: Color): void {
        const arm = 9;
        g.lineWidth = 3;
        g.strokeColor = color;
        g.moveTo(-arm, arm);
        g.lineTo(arm, -arm);
        g.moveTo(-arm, -arm);
        g.lineTo(arm, arm);
        g.stroke();
    }
}
