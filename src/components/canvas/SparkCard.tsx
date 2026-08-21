//
// The card that'll represent a spark in the canvas.
//  React Flow will render it as a node of the "spark" type.
//
// Visual statuses:
//  - Default: only text, max of two lines cut with "..." if it's too long.
//  - Hover: shows category with its color and relative creation date.
//  - With category: color border from the category + light drop shadow.
//  - Selected: more prominent border in the base color (var(--color-accent))
//

import type { NodeProps } from "@xyflow/react";
import type { SparkNode } from "../../lib/flowTransforms";

import { useUIStore, useCategoryStore } from "../../store";
import { useNow } from "../../lib/utils";
import { NodeCardShell } from "./NodeCardShell";

// --------------------------
// Component
// --------------------------

export function SparkCard({ data, selected }: NodeProps<SparkNode>) {
    const { spark } = data;
    const nowMs = useNow();

    const openModal = useUIStore((s) => s.openModal);

    // Read the spark category from the category store.
    // no category = undefined
    const category = useCategoryStore((s) =>
        spark.categoryId
            ? s.categories.find((c) => c.id === spark.categoryId)
            : undefined
    );

    const borderColor = selected
        ? "var(--color-accent)"
        : category
            ? category.color
            : "var(--color-border)";
    
    const boxShadow =
        category && !selected ? `0 0 10px ${category.color}22` : undefined;
    
    return (
        <NodeCardShell
            borderColor={borderColor}
            boxShadow={boxShadow}
            category={category}
            selected={selected}
            createdAt={spark.createdAt}
            now={nowMs}
            onDoubleClick={() => openModal("node-detail", spark.id)}
        >
            {spark.text}
        </NodeCardShell>
    );
}