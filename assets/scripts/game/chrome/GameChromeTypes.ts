import type { Label } from 'cc';

/** 单个圆形图标按钮（由游戏注入 onClick，组件不 switch gameId） */
export interface GameChromeActionDef {
    fallbackChar: string;
    iconName?: string;
    onClick: () => void;
    /** 传给 `Button.EventType.CLICK` 的 target；未传则用箭头函数或无需绑定 */
    clickTarget?: object;
    btnSize?: number;
    fontSize?: number;
}

/** `gap` 占一格水平间距（与一笔画底栏空位一致） */
export type GameChromeSlot = GameChromeActionDef | 'gap';

/** 供 loadIconFont 后刷新 */
export interface GameChromeIconLabelRef {
    lb: Label;
    iconName?: string;
    fontSize: number;
    char: string;
}
