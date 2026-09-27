import { _decorator, Button, Color, Component, director, Label, Node, UITransform, Widget } from 'cc';
import { GameRouter } from '../core/GameRouter';
import { mountRegisteredGame } from '../core/GameRegistry';
import { createIconLabel } from '../core/IconFont';
import { applyGlobalLabelFont } from '../core/LabelFont';

const { ccclass } = _decorator;

@ccclass('GamePlayShell')
export class GamePlayShell extends Component {
    onLoad(): void {
        const canvas = this.node.parent;
        const canvasTrans = canvas?.getComponent(UITransform);
        const cw = canvasTrans ? canvasTrans.width : 720;
        const ch = canvasTrans ? canvasTrans.height : 1280;

        const slot = new Node('GameSlot');
        slot.parent = this.node;
        slot.layer = this.node.layer;
        const slotUt = slot.addComponent(UITransform);
        slotUt.setContentSize(cw, ch);
        slotUt.setAnchorPoint(0.5, 0.5);
        slot.setPosition(0, 0, 0);
        const slotW = slot.addComponent(Widget);
        slotW.isAlignTop = true;
        slotW.isAlignBottom = true;
        slotW.isAlignLeft = true;
        slotW.isAlignRight = true;
        slotW.top = 0;
        slotW.bottom = 0;
        slotW.left = 0;
        slotW.right = 0;
        slotW.alignMode = 2;

        const hud = new Node('HudBack');
        hud.parent = this.node;
        hud.layer = this.node.layer;
        hud.setSiblingIndex(this.node.children.length - 1);
        const hudUt = hud.addComponent(UITransform);
        hudUt.setContentSize(120, 48);
        hudUt.setAnchorPoint(0, 1);
        hud.setPosition(-cw * 0.5 + 12, ch * 0.5 - 12, 0);
        const hudW = hud.addComponent(Widget);
        hudW.isAlignTop = true;
        hudW.isAlignLeft = true;
        hudW.top = 12;
        hudW.left = 12;
        hudW.alignMode = 2;
        
        createIconLabel(hud, this.node.layer, 24, -18, 120, 48, 'home', 32, new Color(8, 139, 201, 255));
        
        const btn = hud.addComponent(Button);
        btn.transition = Button.Transition.NONE;
        hud.on(Button.EventType.CLICK, this.onBackToLobby, this);

        const gameId = GameRouter.consumePendingGameId();
        if (gameId) {
            mountRegisteredGame(gameId, slot);
        } else {
            const tip = new Node('NoGameId');
            tip.parent = slot;
            tip.layer = slot.layer;
            const tUt = tip.addComponent(UITransform);
            tUt.setContentSize(cw - 40, 80);
            const tLb = tip.addComponent(Label);
            tLb.string = '未指定游戏（请从大厅入口进入）';
            tLb.fontSize = 20;
            tLb.color = new Color(80, 90, 95, 255);
            tLb.horizontalAlign = Label.HorizontalAlign.CENTER;
            tLb.verticalAlign = Label.VerticalAlign.CENTER;
            applyGlobalLabelFont(tLb);
        }
    }

    private onBackToLobby(): void {
        director.loadScene('Lobby');
    }
}
