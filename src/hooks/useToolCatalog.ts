//
// Resolves the static tool/schema definitions into full Tool[]/Schema[]
// with translated labels and descriptions at render time.
//
// Check src/lib/constants.ts for why they don't live there anymore.
//

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toolDefinitions, schemaDefinitions } from "../lib/constants";
import type { Tool, Schema } from "../types";

export function useTools(): Tool[] {
    const { t } = useTranslation("tools");

    return useMemo(
        () => toolDefinitions.map((def) => ({
            ...def,
            label:          t(`tools.${def.name}.label`, { defaultValue: def.name }),
            description:    t(`tools.${def.name}.description`, { defaultValue: "" }),
        })),
        [t]
    );
}

export function useSchemas(): Schema[] {
    const { t } = useTranslation("tools");

    return useMemo(
        () => schemaDefinitions.map((def) => ({
            ...def,
            label:          t(`schemas.${def.name}.label`, { defaultValue: def.name }),
            description:    t(`schemas.${def.name}.description`, { defaultValue: "" }),
        })),
        [t]
    );
}
