export interface GameItemDef {
    /** 稳定 id，后续跳转子游戏用 */
    id: string;
    /** 展示名称 */
    title: string;
    /** 图标路径（resources 下，不含扩展名；如 icon/one_stroke_icon） */
    iconPath?: string;
}

export interface CategoryDef {
    id: string;
    title: string;
    games: GameItemDef[];
}

/** 大厅分类与游戏清单 */
export const LOBBY_CATEGORIES: CategoryDef[] = [
    {
        id: 'logic',
        title: '逻辑解谜',
        games: [
            { id: 'one_stroke', title: '一笔画', iconPath: 'icon/one_stroke_icon' },
            { id: 'klotski', title: '数字华容道', iconPath: 'icon/klotski_icon' },
            // { id: 'sudoku', title: '数独' },
            // { id: 'jigsaw', title: '拼图' },
            // { id: 'maze', title: '迷宫' },
            // { id: 'sokoban', title: '推箱子' },
            // { id: 'puzzle_levels', title: '解谜闯关' },
            // { id: 'brain_reasoning', title: '烧脑推理' },
        ],
    },
    {
        id: 'vision',
        title: '眼力找茬',
        games: [
            { id: 'spot_diff', title: '找不同',iconPath: 'icon/spot_diff_icon' },
            // { id: 'hidden_object', title: '找隐藏物品' },
            // { id: 'vision_challenge', title: '眼力大挑战' },
            // { id: 'find_detail', title: '看图找细节' },
            // { id: 'find_typo', title: '找错别字' },
        ],
    },
    {
        id: 'word',
        title: '文字益智',
        games: [
            { id: 'idiom_chain', title: '成语接龙' },
            // { id: 'riddle_char', title: '猜字谜' },
            // { id: 'word_fill', title: '填词闯关' },
            // { id: 'hanzi_match', title: '汉字消消乐' },
            // { id: 'poetry_quiz', title: '诗词答题' },
            // { id: 'pinyin_learn', title: '拼音识字' },
        ],
    },
    {
        id: 'match_merge',
        title: '消除合成',
        games: [
            // { id: 'match3', title: '经典三消' },
            // { id: 'merge', title: '合并合成' },
            { id: 'path_link', title: '星步连线' },
            { id: 'sum_ten', title: '凑十消除' },
            { id: 'chess_clear', title: '象棋消除' },
        ],
    },
    {
        id: 'physics',
        title: '物理益智',
        games: [
            // { id: 'draw_physics', title: '物理画线' },
            // { id: 'bridge_cross', title: '搭桥过河' },
            { id: 'pour_water', title: '倒水解谜' },
            // { id: 'physics_relax', title: '物理解压闯关' },
            // { id: 'catapult', title: '弹射闯关' },
        ],
    },
    {
        id: 'memory',
        title: '记忆脑力',
        games: [
            // { id: 'flip_cards', title: '翻牌记忆' },
            // { id: 'pattern_copy', title: '图案复刻' },
            // { id: 'brain_train', title: '脑力训练' },
            // { id: 'focus_challenge', title: '专注力挑战' },
            // { id: 'reaction_test', title: '反应速度测试' },
        ],
    },
    {
        id: 'strategy_casual',
        title: '休闲策略',
        games: [
            // { id: 'td_puzzle', title: '塔防益智' },
            // { id: 'sim_manage', title: '模拟经营' },
            // { id: 'layout_levels', title: '布局闯关' },
            // { id: 'turn_strategy', title: '回合策略' },
            // { id: 'formation', title: '闯关布阵' },
        ],
    },
    {
        id: 'number',
        title: '数字算术',
        games: [
            // { id: 'oral_calc', title: '口算闯关' },
            // { id: 'game24', title: '24 点' },
            // { id: 'math_puzzle', title: '数学谜题' },
            // { id: 'number_fill', title: '数字填空' },
            // { id: 'arithmetic', title: '算术挑战' },
        ],
    },
    {
        id: 'creative',
        title: '脑洞创意',
        games: [
            // { id: 'brain_hole_master', title: '脑洞大师' },
            // { id: 'riddle_joke', title: '脑筋急转弯' },
            // { id: 'reverse_think', title: '逆向思维' },
            // { id: 'absurd_levels', title: '离谱闯关' },
            // { id: 'brain_burn', title: '脑洞烧脑' },
        ],
    },
    {
        id: 'traditional',
        title: '国风传统',
        games: [
            // { id: 'xiangqi_endgame', title: '象棋残局' },
            // { id: 'gomoku', title: '五子棋' },
            // { id: 'weiqi_intro', title: '围棋入门' },
            // { id: 'luban_lock', title: '鲁班锁' },
            // { id: 'traditional_ring', title: '传统巧环' },
            // { id: 'guocui_puzzle', title: '国粹解谜' },
        ],
    },
];

export const ALL_GAME_SET = LOBBY_CATEGORIES
    .map(item => item.games)
    .reduce((acc, games) => acc.concat(games), [] as GameItemDef[]);

