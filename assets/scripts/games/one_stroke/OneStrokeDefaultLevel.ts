import type { OneStrokeLevelJson } from './OneStrokeLevelTypes';

/** 与 resource/1.json 同步（策划改 JSON 时请同步此处或改为运行时加载） */
export const DEFAULT_ONE_STROKE_LEVEL: OneStrokeLevelJson = {
    canvas: { width: 540, height: 750 },
    v2: [
        { id: 'A', x: 90, y: 150 },
        { id: 'B', x: 450, y: 150 },
        { id: 'C', x: 450, y: 510 },
        { id: 'D', x: 90, y: 510 },
    ],
    lines: [
        { id: 0, start: 'A', end: 'B' },
        { id: 1, start: 'B', end: 'C' },
        { id: 2, start: 'C', end: 'D' },
        { id: 3, start: 'D', end: 'A' },
    ],
    bid: 1,
    mid: 1,
    lid: 1,
};
