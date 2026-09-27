import { Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { GlobalAssets } from './GlobalAssets';
import { applyGlobalLabelFont } from './LabelFont';

export function applyGlobalFont(label: Label, fontSize?: number): void {
    applyGlobalLabelFont(label);
    if (fontSize !== undefined) {
        label.fontSize = fontSize;
    }
}

export function applyIcon(sprite: Sprite, iconName: string): void {
    const icon = GlobalAssets.getIcon(iconName);
    if (icon) {
        sprite.spriteFrame = icon;
    }
}

export function createIconNode(parent: any, layer: number, x: number, y: number, w: number, h: number, iconName: string): any {
    const n = new Node(`Icon_${iconName}`);
    n.parent = parent;
    n.layer = layer;
    n.setPosition(x, y, 0);
    const ut = n.addComponent(UITransform);
    ut.setContentSize(w, h);
    ut.setAnchorPoint(0.5, 0.5);
    const sp = n.addComponent(Sprite);
    applyIcon(sp, iconName);
    return n;
}
