/** 与 resource/*.json 一致 */
export interface OneStrokeCanvas {
    width: number;
    height: number;
}

export interface OneStrokeVertex {
    id: string;
    x: number;
    y: number;
}

export interface OneStrokeLineDef {
    id: number;
    start: string;
    end: string;
    /** 该边需经过次数，默认 1 */
    repeat?: number;
    /** 有向：仅允许 start → end */
    lock?: boolean;
}

export interface OneStrokeLevelJson {
    canvas: OneStrokeCanvas;
    v2: OneStrokeVertex[];
    lines: OneStrokeLineDef[];
    bid?: number;
    mid?: number;
    lid?: number;
}
