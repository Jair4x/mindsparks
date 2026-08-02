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

import { useState } from "react";
import { NodeProps } from "@xyflow/react";
import { useUIStore, useCategoryStore } from "../../store";
import type { SparkNode } from "../../lib/flowTransforms";
import { formatRelativeDate } from "../../lib/utils";
import { useNow } from "../../lib/utils";

// --------------------------
// Component
// --------------------------

export function SparkCard({ data, selected }: NodeProps<SparkNode>) {
    const { spark } = data;
    const [isHovered, setIsHovered] = useState(false);

    const now = useNow();

    const openModal = useUIStore((state) => state.openModal);

    // Read the spark category from the category store.
    // no category = undefined
    const category = useCategoryStore((state) =>
        spark.categoryId
            ? state.categories.find((c) => c.id === spark.categoryId)
            : undefined
    );

    // Double terniary here because screw it.
    const borderColor = selected
        ? "var(--color-accent)"
        : category
            ? category.color
            : "var(--color-border)";
    
    const boxShadow =
        category && !selected ? `0 0 10px ${category.color}22` : undefined;
    
    const handleClick = () => {
        openModal("spark-detail", spark.id);
    }

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
            }}
        >
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
                    {formatRelativeDate(spark.createdAt, now)}
                </span>
            </div>
            <div
                className="line-clamp-2"
                style={{
                    fontSize: 13,
                    color: "var(--color-text)",
                    lineHeight: 1.45,
                }}
            >
                {spark.text}
            </div>
        </div>
    );
}