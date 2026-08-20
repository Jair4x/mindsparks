//
// Single source of truth for "assign a category to a set of nodes".
//
// Used both by the quick inline list (click an existing category in ContextMenu's submenu)
//  and by AssignCategoryModal (create-new or pick-from-list, opened from ContextMenu or from SparkModal).
//

import { useSparkStore, useFlameStore, useUIStore } from "../store";
import type { SelectedNode } from "../store";

export function useAssignCategory() {
    const assignSparkCategory   = useSparkStore((s) => s.assignCategory);
    const assignFlameCategory   = useFlameStore((s) => s.assignCategory);
    const clearSelection        = useUIStore((s) => s.clearSelection);

    return (targetNodes: SelectedNode[], categoryId: string | undefined) => {
        targetNodes.forEach((node) => {
            if (node.type === "spark") {
                assignSparkCategory(node.id, categoryId);
            } else {
                assignFlameCategory(node.id, categoryId);
            }
        });

        // Assigning a category is a terminal action on the current selection, so
        // we clear it here once, for every caller.
        clearSelection();
    };
}