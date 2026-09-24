//
// Shared container for canvas cards (SparkCard, FlameCard).
//
// Both card types are visually identical "shells", they have the same size/border/padding rules,
// same hover-revealed "category + date" metadata row, same clamped text content.
//
// They only differ in border/shadow color logic (computed by the caller), and in what extra
// bits they hang off the shell (Flame's icon and tool row).
//
// This file was made so a visual tweak to "how a card looks" only has to happen once here
//  and to comply with DRY (Don't Repeat Yourself), to prevent duplicate logic.
//

import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { Check } from "lucide-react";
import type { Category } from "../../types";
import { formatRelativeDate } from "../../lib/utils";
import {
    DEFAULT_CARD_WIDTH
 } from "../../lib/constants";

// --------------------------
// Props
// --------------------------

interface NodeCardShellProps {
    borderColor:    string;
    boxShadow?:     string;
    opacity?:       number;
    selected?:      boolean;

    // Flame needs 'position: relative', so its flame icon can be
    // absolutely positioned within the card. Spark doesn't, so it's opt-in.
    relativePosition?: boolean;

    category:   Category | undefined;
    createdAt:  string;
    now:        number;

    onDoubleClick: () => void;

    // Rendered top-right, absolutely positioned. Receives isHovered so callers
    // can fade/scale it on hover the same way FlameCard's flame icon does.
    cornerBadge?: (isHovered: boolean) => React.ReactNode;

    // Extra content below the main text (e.g. FlameCard's active-tool icons).
    footer?: React.ReactNode;

    contentStyle?: React.CSSProperties;

    // The card's main line-clamped text (spark.name / flame.name).
    children: React.ReactNode;
}

// --------------------------
// NodeCardShell
// --------------------------

export function NodeCardShell({
    borderColor,
    boxShadow,
    opacity = 1,
    selected = false,
    relativePosition = false,
    category,
    createdAt,
    now,
    onDoubleClick,
    cornerBadge,
    footer,
    contentStyle,
    children,
}: NodeCardShellProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onDoubleClick={onDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: "var(--color-surface)",
                border: `${selected ? 2 : 0.5}px solid ${borderColor}`,
                borderRadius: 12,
                padding: "10px 14px",
                width: DEFAULT_CARD_WIDTH,
                cursor: "pointer",
                transition: "border-color 0.15s, border-width 0.15s",
                boxShadow,
                opacity,
                position: (relativePosition || selected) ? "relative" : undefined,
            }}
        >
            <Handle
                type="target"
                position={Position.Top}
                style={{ opacity: 0, pointerEvents: "none" }}
            />

            <Handle
                type="source"
                position={Position.Top}
                style={{ opacity: 0, pointerEvents: "none" }}
            />

            {/* When selected, a little badge appears indicating you selected a node */}
            {selected && (
                <div
                    style={{
                        position: "absolute",
                        top: -8,
                        left: -8,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                        color: "var(--color-surface)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 0 2px var(--color-surface)",
                    }}
                >
                    <Check size={10} strokeWidth={3} />
                </div>
            )}

            {cornerBadge?.(isHovered)}

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
                    {formatRelativeDate(createdAt, now)}
                </span>
            </div>

            <div
                className="line-clamp-2"
                style={{
                    fontSize: 13,
                    color: "var(--color-text)",
                    lineHeight: 1.45,
                    ...contentStyle,
                }}
            >
                {children}
            </div>

            {footer}
        </div>
    );
}