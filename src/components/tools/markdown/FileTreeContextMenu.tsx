import { useEffect, useRef, useState } from "react";

interface FileTreeContextMenuProps {
    x:          number;
    y:          number;
    onRename:   () => void;
    onDelete:   () => void;
    onClose:    () => void;
}

export function FileTreeContextMenu({ x, y, onRename, onDelete, onClose }: FileTreeContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        }
        
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }

        window.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleKey);

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            className="fixed flex flex-col z-50"
            style={{
                left: x,
                top: y,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: 4,
                minWidth: 120,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
        >
            <MenuItem label="Rename" onClick={onRename} />
            <MenuItem label="Delete" onClick={onDelete} danger />
        </div>
    );
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="text-left cursor-pointer bg-transparent border-none"
            style={{
                padding: "6px 10px",
                borderRadius: 4,
                fontSize: 13,
                fontFamily: "inherit",
                color: danger ? "var(--color-danger)" : "var(--color-text)",
                background: isHovered ? "var(--color-surface-raised)" : "transparent",
            }}
        >
            {label}
        </button>
    );
}