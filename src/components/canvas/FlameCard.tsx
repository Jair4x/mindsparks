//
// The card that'll represent a flame in the canvas.
//  React Flow will render it as a node of the "flame" type.
//

import { useState } from "react";
import { NodeProps } from "@xyflow/react";
import { Flame } from "lucide-react";
import { useUIStore, useCategoryStore } from "../../store";
import { formatRelativeDate } from "../../lib/utils";
import { FlameNode } from "../../lib/flowTransforms";

// --------------------------
// Component
// --------------------------

export function FlameCard({ data, selected }: NodeProps<FlameNode>) {
    const { flame } = data;
    const [isHovered, setIsHovered] = useState(false);

    const openFlame = useUIStore((state) => state.openFlame);

    const category = useCategoryStore((state) =>
        flame.categoryId
            ? state.categories.find((f) => f.id === flame.categoryId)
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

    const handleClick = () => {
        openFlame(flame.id)
    };

    const hasTracker = flame.tools.includes("checklist");
    const progress = 0; // TODO: Calculate from the tracker's tasks.

    return (
        <div
            onClick={handleClick}
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
                Flame icon 
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
                    {formatRelativeDate(flame.createdAt)}
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
                Progress bar (visible if the flame has an active tracker)
                
                This is a div, inside a div, inside a div. Yeah.
            */}
            {hasTracker && (
                <div
                    style={{
                        marginTop: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: 3,
                            background: "var(--color-surface-raised)",
                            borderRadius: 2,
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                width: `${progress}%`,
                                height: "100%",
                                background: "var(--color-flame)",
                                borderRadius: 2,
                                transition: "width 0.3s ease",
                            }}
                        />
                    </div>

                    <span
                        style={{
                            fontSize: 10,
                            color: "var(--color-text-muted)",
                            minWidth: 24,
                            textAlign: "right",
                        }}
                    >
                        {progress}%
                    </span>
                </div>
            )}
        </div>
    );
}
