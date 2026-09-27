import { Label, Node, UITransform } from 'cc';
import { ChessClearFramework } from '../games/chess_clear/ChessClearFramework';
import { IdiomChainFramework } from '../games/idiom_chain/IdiomChainFramework';
import { KlotskiFramework } from '../games/klotski/KlotskiFramework';
import { OneStrokeFramework } from '../games/one_stroke/OneStrokeFramework';
import { PathLinkFramework } from '../games/path_link/PathLinkFramework';
import { PourWaterFramework } from '../games/pour_water/PourWaterFramework';
import { SpotDiffFramework } from '../games/spot_diff/SpotDiffFramework';
import { SumTenFramework } from '../games/sum_ten/SumTenFramework';
import { applyGlobalLabelFont } from './LabelFont';

const REGISTERED_GAME_IDS = new Set([
    'one_stroke',
    'klotski',
    'spot_diff',
    'idiom_chain',
    'chess_clear',
    'pour_water',
    'sum_ten',
    'path_link',
]);

export function isGameRegistered(gameId: string): boolean {
    return REGISTERED_GAME_IDS.has(gameId);
}

/**
 * gameId → 在 GameSlot 下挂载的根逻辑（后续可改为 loadPrefab / loadBundle）。
 */
export function mountRegisteredGame(gameId: string, slot: Node): void {
    switch (gameId) {
        case 'one_stroke':
            slot.addComponent(OneStrokeFramework);
            return;
        case 'klotski':
            slot.addComponent(KlotskiFramework);
            return;
        case 'spot_diff':
            slot.addComponent(SpotDiffFramework);
            return;
        case 'idiom_chain':
            slot.addComponent(IdiomChainFramework);
            return;
        case 'chess_clear':
            slot.addComponent(ChessClearFramework);
            return;
        case 'pour_water':
            slot.addComponent(PourWaterFramework);
            return;
        case 'sum_ten':
            slot.addComponent(SumTenFramework);
            return;
        case 'path_link':
            slot.addComponent(PathLinkFramework);
            return;
        default:
            break;
    }

    const tip = new Node('UnknownGame');
    tip.parent = slot;
    tip.layer = slot.layer;
    const tUt = tip.addComponent(UITransform);
    const p = slot.getComponent(UITransform);
    const w = p ? p.width - 40 : 600;
    tUt.setContentSize(w, 80);
    const tLb = tip.addComponent(Label);
    tLb.string = `游戏「${gameId}」尚未在 GameRegistry 中注册`;
    tLb.fontSize = 20;
    tLb.lineHeight = 28;
    tLb.horizontalAlign = Label.HorizontalAlign.CENTER;
    tLb.verticalAlign = Label.VerticalAlign.CENTER;
    applyGlobalLabelFont(tLb);
}
