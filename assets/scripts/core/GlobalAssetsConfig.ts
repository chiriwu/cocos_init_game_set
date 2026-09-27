import { GlobalAssets } from './GlobalAssets';
import { loadIconFont } from './IconFont';

export const GLOBAL_FONTS: Array<{ name: string; uuid: string }> = [];

export const GLOBAL_ICONS = [
];

export function initGlobalAssets(callback?: () => void): void {
    loadIconFont(() => {
        GlobalAssets.init(GLOBAL_FONTS, GLOBAL_ICONS, callback);
    });
}
