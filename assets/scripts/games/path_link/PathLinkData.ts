export type PathLinkCellType = 'dot' | 'star' | 'step' | 'end';

export interface PathLinkCell {
    type: PathLinkCellType;
    /** 数字格：必须在该步数踩中 */
    requiredStep?: number;
}

export interface PathLinkLevelDef {
    rows: number;
    cols: number;
    /** 总步数（最后一步须落在双圆环上） */
    totalSteps: number;
    /** 规则条上的星星步数：在该步滑入任意星星格即合法 */
    starSteps: number[];
    grid: PathLinkCell[][];
}

/** 关卡：3×3 入门（与参考图一致） */
export const PATH_LINK_LEVELS: PathLinkLevelDef[] = [
    {
        rows: 3,
        cols: 3,
        totalSteps: 9,
        starSteps: [4, 5, 7],
        grid: [
            [
                { type: 'star' },
                { type: 'dot' },
                { type: 'dot' },
            ],
            [
                { type: 'star' },
                { type: 'star' },
                { type: 'dot' },
            ],
            [
                { type: 'step', requiredStep: 6 },
                { type: 'dot' },
                { type: 'end' },
            ],
        ],
    },
    {
        rows: 4,
        cols: 4,
        totalSteps: 12,
        starSteps: [3, 6, 8],
        grid: [
            [
                { type: 'dot' },
                { type: 'star' },
                { type: 'dot' },
                { type: 'dot' },
            ],
            [
                { type: 'dot' },
                { type: 'step', requiredStep: 5 },
                { type: 'dot' },
                { type: 'star' },
            ],
            [
                { type: 'star' },
                { type: 'dot' },
                { type: 'step', requiredStep: 9 },
                { type: 'dot' },
            ],
            [
                { type: 'dot' },
                { type: 'dot' },
                { type: 'dot' },
                { type: 'end' },
            ],
        ],
    },
];
