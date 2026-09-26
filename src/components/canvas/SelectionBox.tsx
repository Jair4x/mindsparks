//
// Box that appears when group selecting (Shift + drag)
//  Has a node counter in the corner opposite to the cursor
//

import { useUIStore } from "../../store";
import { HEADER_HEIGHT } from "../../lib/constants";

// --------------------------
// Interface
// --------------------------

interface SelectionBoxProps {
    nodeCount: number;
}

// --------------------------
// SelectionBox
// --------------------------

export function SelectionBox({ nodeCount }: SelectionBoxProps) {
    const selectionBox = useUIStore((state) => state.selectionBox);

    if (!selectionBox) return null;

    const { start, current } = selectionBox;

    // Calculate box dimensions
    const left      = Math.min(start.x, current.x);
    const top       = Math.min(start.y, current.y) - HEADER_HEIGHT;
    const width     = Math.abs(current.x - start.x);
    const height    = Math.abs(current.y - start.y);
    
    // Show the counter in the corner opposite to the cursor.
    // If the cursor is on the right side of the box, show it on the left, and vice versa.
    // Same for top/bottom
    const pillOnRight = current.x < start.x;
    const pillOnBottom = current.y < start.y;

    return (
        <div
            style={{
                position: "absolute",
                left,
                top,
                width,
                height,
                background: "var(--color-accent-glow)",
                border: "1px solid var(--color-accent)",
                borderRadius: 4,
                pointerEvents: "none",
                zIndex: 50,
            }}
        >
            {/* The counter */}
            {nodeCount > 0 && (
                <div
                    className="absolute text-white whitespace-nowrap select-none"
                    style={{
                        top: pillOnBottom       ? "auto"    : -10,
                        bottom: pillOnBottom    ? -10       : "auto",
                        left: pillOnRight       ? -6        : "auto",
                        right: pillOnRight      ? "auto"    : -6,
                        background: "var(--color-accent)",
                        border: "1px solid var(--color-accent)",
                        borderRadius: 999,
                        padding: "1px 7px",
                        fontSize: 11,
                        fontWeight: 600,
                    }}
                >
                    {nodeCount}
                </div>
            )}
        </div>
    );
}