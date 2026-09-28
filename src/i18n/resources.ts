import enCommon from "../locales/en/common.json";
import enSpaces from "../locales/en/spaces.json";
import enVault from "../locales/en/vault.json";
import enCanvas from "../locales/en/canvas.json";
import enQuick from "../locales/en/quick-capture.json";

export const defaultNS = "common";

export const resources = {
    en: {
        common: enCommon,
        spaces: enSpaces,
        vault: enVault,
        canvas: enCanvas,
        quickCapture: enQuick,
    },
} as const;