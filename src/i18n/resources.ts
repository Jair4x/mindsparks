import common_EN from "../locales/en/common.json";
import spaces_EN from "../locales/en/spaces.json";
import vault_EN from "../locales/en/vault.json";
import canvas_EN from "../locales/en/canvas.json";
import quick_EN from "../locales/en/quick-capture.json";
import nodes_EN from "../locales/en/nodes.json";
import categories_EN from "../locales/en/categories.json";
import tools_EN from "../locales/en/tools.json";

export const defaultNS = "common";

export const resources = {
    en: {
        common: common_EN,
        spaces: spaces_EN,
        vault: vault_EN,
        canvas: canvas_EN,
        quickCapture: quick_EN,
        nodes: nodes_EN,
        categories: categories_EN,
        tools: tools_EN,
    },
} as const;