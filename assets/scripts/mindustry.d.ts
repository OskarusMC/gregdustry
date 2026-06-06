// mindustry.d.ts
// This provides native, flawless autocomplete for Mindustry's JS API

declare const Vars: {
    content: {
        blocks(): { size: number; get(index: number): any };
        items(): { size: number; get(index: number): any };
        item(name: string): any;
        liquid(name: string): any;
        getByName(type: any, name: string): any;
    };
    mods: {
        getMod(name: string): { root: { child(path: string): any } };
    };
};

declare const Time: {
    delta: number;
};

declare const ContentType: {
    block: any;
};

declare const Events: {
    on(event: any, trigger: (e: any) => void): void;
};

declare const ClientLoadEvent: any;

declare const Log: {
    info(text: string): void;
    err(text: string): void;
};

declare const Styles: {
    cleari: any;
};

declare class TextureRegionDrawable {
    constructor(region: any);
}

declare const Jval: {
    read(text: string): {
        has(key: string): boolean;
        get(key: string): {
            asArray(): any;
            getString(key: string, def: string): string;
            getInt(key: string, def: number): number;
            getBool(key: string, def: boolean): boolean;
        };
    };
};

declare function extend(base: any, name: string, configurations: object): any;
declare function extend(base: any, configurations: object): any;
declare function require(module: string): any;