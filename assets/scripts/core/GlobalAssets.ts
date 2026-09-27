import { assetManager, Font, SpriteFrame, Texture2D } from 'cc';

export interface GlobalFontConfig {
    /** 字体名称 */
    name: string;
    /** 字体文件 UUID */
    uuid: string;
}

export interface GlobalIconConfig {
    /** 图标名称 */
    name: string;
    /** 图标文件 UUID */
    uuid: string;
}

export class GlobalAssets {
    private static _fonts = new Map<string, Font>();
    private static _icons = new Map<string, SpriteFrame>();
    private static _defaultFont: Font | null = null;

    static get defaultFont(): Font | null {
        return this._defaultFont;
    }

    static getFont(name: string): Font | null {
        return this._fonts.get(name) || this._defaultFont;
    }

    static getIcon(name: string): SpriteFrame | null {
        return this._icons.get(name) || null;
    }

    static init(fonts: GlobalFontConfig[], icons: GlobalIconConfig[], callback?: () => void): void {
        const assets: Array<{ uuid: string; type?: string }> = [];
        const fontUuids = new Map<string, string>();
        const iconUuids = new Map<string, string>();

        for (const f of fonts) {
            fontUuids.set(f.uuid, f.name);
            assets.push({ uuid: f.uuid });
        }

        for (const ic of icons) {
            iconUuids.set(ic.uuid, ic.name);
            assets.push({ uuid: ic.uuid });
        }

        if (assets.length === 0) {
            callback?.();
            return;
        }

        assetManager.loadAny(assets, (err, results) => {
            if (err) {
                console.warn('[GlobalAssets] 加载资源失败:', err);
                callback?.();
                return;
            }

            for (let i = 0; i < assets.length; i++) {
                const asset = results.getContent(assets[i].uuid);
                const uuid = assets[i].uuid;

                if (fontUuids.has(uuid)) {
                    const name = fontUuids.get(uuid)!;
                    this._fonts.set(name, asset as Font);
                    if (i === 0) {
                        this._defaultFont = asset as Font;
                    }
                } else if (iconUuids.has(uuid)) {
                    const name = iconUuids.get(uuid)!;
                    this._icons.set(name, asset as SpriteFrame);
                }
            }

            callback?.();
        });
    }
}
