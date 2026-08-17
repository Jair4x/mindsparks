//
// Floating input that opens when the user double clicks in the canvas.
//
// This only captures the text and notifies the Canvas, who calls the store.
//

import { useEffect, useRef, useState } from "react";
import type { Position } from "../../types";

// --------------------------
// Props
// --------------------------

interface SparkInputProps {
    // Position in canvas coordinates (already converted by screenToFlowPosition).
    position: Position;

    // Call when the user confirms with Enter.
    // Receives the written text. If it's empty, it doesn't get called.
    onConfirm: (text: string) => void;

    // Call when the user cancels with Escape or clicks outside.
    onCancel: () => void;
}

// --------------------------
// Component
// --------------------------

export function SparkInput({ position, onConfirm, onCancel }: SparkInputProps) {
    const [text, setText] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-focus when mounting so the user can write inmediately
    // without needing to click in the input.
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            const trimmed = text.trim();
            if (trimmed.length > 0) {
                onConfirm(trimmed);
            }
        }

        if (event.key === "Escape") {
            onCancel();
        }
    };

    const handleBlur = () => {
        // if the user clicks out of the input, cancel.
        // Using setTimeout to give time to other events to get processed first
        // (such as a click in the canvas).
        setTimeout(() => {
            onCancel();
        }, 100);
    }

    const offsetX = position.x > window.innerWidth  / 2 ? -200 : 0;
    const offsetY = position.y > window.innerHeight / 2 ? -100 : 0;

    return (
        <div
            style={{
                position: "absolute",
                left: position.x + offsetX,
                top: position.y + offsetY,
                zIndex: 50,
            }}
        >
            <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder="New idea..."
                rows={2}
                style={{
                    background: "var(--color-surface)",
                    border: "0.5px solid var(--color-accent)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "var(--color-text)",
                    width: 300,
                    resize: "none",
                    outline: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.45,
                    boxShadow: "0 0 12px var(--color-accent-glow)",
                }}
            />
            <div
                style={{
                    fontSize: 11,
                    color: "var(--color-text)",
                    marginTop: 4,
                    paddingLeft: 2,
                }}
            >
                Enter to Confirm - Esc to Cancel
            </div>
        </div>
    )
}