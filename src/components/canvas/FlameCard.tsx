//
// The card that'll represent a flame in the canvas.
//  React Flow will render it as a node of the "flame" type.
//

import type { NodeProps } from "@xyflow/react";
import { Flame } from "lucide-react";
import { useUIStore, useCategoryStore } from "../../store";
import { useNow } from "../../lib/utils";
import { getToolIcon } from "../../lib/tools/toolConfig";
import { NodeCardShell } from "./NodeCardShell";
import { FlameNode } from "../../lib/flowTransforms";
import { tools } from "../../lib/constants";

// --------------------------
// Component
// --------------------------

export function FlameCard({ data, selected }: NodeProps<FlameNode>) {
    const { flame } = data;
    const nowMs = useNow();
    const openFlame = useUIStore((s) => s.openFlame);

    const category = useCategoryStore((s) =>
        flame.categoryId
            ? s.categories.find((f) => f.id === flame.categoryId)
            : undefined
    );

    const borderColor = selected
        ? "var(--color-accent)"
        : category
            ? category.color
            : "var(--color-border)";
    
    const boxShadow = category
        ? `0 0 10px ${category.color}22`
        : `0 0 8px var(--color-accent-muted)`;

    // Get the Tool objects for the active tools in this flame
    const activeTools = flame.tools
        .map((instance) => {
            const toolDef = tools.find((t) => t.name === instance.type);
            return toolDef ? { instanceId: instance.id, toolDef } : null;
        })
        .filter((entry) => entry !== null);
    
    return (
        <NodeCardShell
            borderColor={borderColor}
            boxShadow={boxShadow}
            opacity={flame.isCompleted ? 0.5 : 1}
            relativePosition
            category={category}
            selected={selected}
            createdAt={flame.createdAt}
            now={nowMs}
            onDoubleClick={() => openFlame(flame.id)}
            contentStyle={{ paddingRight: 16 }}
            cornerBadge={(isHovered) => (
                    <div
                    style={{
                        position: "absolute",
                        top: "25%",
                        right: 10,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--color-surface-raised)",
                        color: "var(--color-flame)",
                        opacity: isHovered ? 0 : 1,
                        transform: isHovered ? "scale(0.5)" : "scale(1)",
                        transition: "opacity 0.15s, transform 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Flame size={12} />
                </div>
            )}
            footer={activeTools.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                    {activeTools.map(({ instanceId, toolDef }) => (
                        <div
                            key={instanceId}
                            title={toolDef.label}
                            className="flex items-center justify-center"
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                background: "var(--color-surface-raised)",
                                color: "var(--color-accent)",
                            }}
                        >
                            {getToolIcon(toolDef.icon)}
                        </div>
                    ))}
                </div>
            )}
        >
            {flame.name}
        </NodeCardShell>
    );
}
