//
// The card that'll represent a flame in the canvas.
//  React Flow will render it as a node of the "flame" type.
//

import { useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Flame } from "lucide-react";
import { useUIStore, useCategoryStore } from "../../store";
import { formatRelativeDate, useNow } from "../../lib/utils";
import { getToolIcon } from "../../lib/toolConfig";
import { FlameNode } from "../../lib/flowTransforms";
import { tools } from "../../lib/constants";

// --------------------------
// Component
// --------------------------

export function FlameCard({ data, selected }: NodeProps<FlameNode>) {
    const { flame } = data;
    const [isHovered, setIsHovered] = useState(false);
    const now = useNow();

    const openFlame = useUIStore((s) => s.openFlame);

    const category = useCategoryStore((s) =>
        flame.categoryId
            ? s.categories.find((f) => f.id === flame.categoryId)
            : undefined
    );

    // Double terniary here because screw it.
    const borderColor = selected
        ? "var(--color-accent)"
        : category
            ? category.color
            : "var(--color-border)";
    
    const boxShadow = category
        ? `0 0 10px ${category.color}22`
        : `0 0 8px var(--color-accent-muted)`;
    
    const opacity = flame.isCompleted ? 0.5 : 1;

    // Get the Tool objects for the active tools in this flame
    const activeTools = flame.tools
        .map((toolName) => tools.find((t) => t.name === toolName))
        .filter(Boolean);

    const handleClick = () => {
        openFlame(flame.id)
    };

    return (
        <div
            onDoubleClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: "var(--color-surface)",
                border: `0.5px solid ${borderColor}`,
                borderRadius: 12,
                padding: "10px 14px",
                width: 180,
                cursor: "pointer",
                transition: "border-color 0.15s",
                boxShadow,
                opacity,
                position: "relative",
            }}
        >
            {/*
                Flame icon (fades out on hover to show metadata)
            */}
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

            {/*
                Metadata: category and date. Only visible on hover.
            */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: isHovered ? 5 : 0,
                    fontSize: 11,
                    color: "var(--color-text-muted)",
                    opacity: isHovered ? 1 : 0,
                    maxHeight: isHovered ? 20 : 0,
                    overflow: "hidden",
                    transition: "opacity 0.15s ease, max-height 0.15s ease, margin-bottom 0.15s ease",
                }}
            >
                {category ? (
                    <>
                        <span
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: category.color,
                                flexShrink: 0,
                            }}
                        />
                        <span>{category.name}</span>
                    </>
                ) : null}

                <span style={{ marginLeft: "auto" }}>
                    {formatRelativeDate(flame.createdAt, now)}
                </span>
            </div>
            <div
                className="line-clamp-2"
                style={{
                    fontSize: 13,
                    color: "var(--color-text)",
                    lineHeight: 1.45,
                    paddingRight: 16,
                }}
            >
                {flame.name}
            </div>

            {/*
                Active tools icons, shown below the name.
            */}
            {activeTools.length > 0 && (
                <div
                    className="flex items-center gap-1 mt-2"
                >
                    {activeTools.map((tool) => tool && (
                        <div
                            key={tool.name}
                            title={tool.label}
                            className="flex items-center justify-center"
                            style={{
                                width: 20,
                                height: 20,
                                borderRadius: 4,
                                background: "var(--color-surface-raised)",
                                color: "var(--color-accent)",
                            }}
                        >
                            {getToolIcon(tool.icon)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
