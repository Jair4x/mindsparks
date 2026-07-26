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

    const openModal = useUIStore((state) => state.openModal);

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
        // TODO: Open the full flame view, not the detail modal.
        openModal("spark-detail", flame.id);
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
                    top: 8,
                    right: 10,
                    color: "var(--color-flame)", // Orange
                    display: "flex",
                    alignItems: "center",
                }}
            >
                <Flame size={12} />
            </div>

            {/*
                Metadata: category and date. Only visible on hover.
            */}
            {isHovered && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 5,
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        paddingRight: 16, // for the flame icon
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
            )}
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
