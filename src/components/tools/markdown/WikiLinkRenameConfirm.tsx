//
// A confirmation dialog for when you rename a file in the file tree of the Markdown Tool
//  that asks "Do you want to change M references to this file to N files?"
//
// TODO: SQLite when done for "don't ask again"
//

import { useState } from "react";

interface WikiLinkRenameConfirmProps {
    referenceCount: number;
    fileCount:      number;
    onConfirm:      (rememberChoice: boolean) => void;
    onCancel:       (rememberChoice: boolean) => void;
}

export function WikiLinkRenameConfirm({ referenceCount, fileCount, onConfirm, onCancel }: WikiLinkRenameConfirmProps) {
    const [rememberChoice, setRememberChoice] = useState(false);

    return (
        <div
            onClick={() => onCancel(false)}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.5)" }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col gap-3 select-none"
                style={{
                    background: "var(--color-surface)",
                    border: "0.5px solid var(--color-border)",
                    borderRadius: 12,
                    padding: 20,
                    width: 360,
                }}
            >
                <div style={{ fontSize: 13, color: "var(--color-text)" }}>
                    Update {referenceCount} WikiLink{referenceCount === 1 ? "" : "s"} in {fileCount}{" "}
                    file{fileCount === 1 ? "" : "s"} to match the rename?
                </div>

                <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                    You might lose your edit history if the currently opened file is referencing it.
                </div>

                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    <input type="checkbox" checked={rememberChoice} onChange={(e) => setRememberChoice(e.target.checked)}/>
                    Remember my choice for this session
                </label>

                <div className="flex justify-end gap-2">
                    <ConfirmButton onClick={() => onCancel(rememberChoice)} variant="neutral">
                        Skip
                    </ConfirmButton>
                    <ConfirmButton onClick={() => onConfirm(rememberChoice)} variant="accent">
                        Update
                    </ConfirmButton>
                </div>
            </div>
        </div>
    );
}

function ConfirmButton({
    onClick,
    variant,
    children,
}: {
    onClick: () => void;
    variant: "neutral" | "accent";
    children: React.ReactNode;
}) {
    const [isHovered, setIsHovered] = useState(false);

    const base =
        variant === "accent"
            ? { background: "var(--color-accent)", color: "var(--color-bg)", border: "none" }
            : { background: "transparent", color: "var(--color-text-muted)", border: "0.5px solid var(--color-border)" };

    const hovered =
        variant === "accent"
            ? { background: "var(--color-accent-dark)" }
            : { background: "var(--color-surface-raised)", color: "var(--color-text)" };

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="cursor-pointer"
            style={{
                ...base,
                ...(isHovered ? hovered : {}),
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s",
            }}
        >
            {children}
        </button>
    );
}