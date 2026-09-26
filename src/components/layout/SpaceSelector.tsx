//
// Dropdown anchored to the header button.
//
// Only lists Spaces and switches the active one.
//  Creating, editing (name/icon/color) and deleting all happen in the modal.
//

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Check, ChevronDown } from "lucide-react";
import { useSpaceStore, useUIStore } from "../../store";
import { getSpaceIcon } from "../../lib/spaceIcons";

export function SpaceSelector() {
    const [isOpen, setIsOpen]                       = useState(false);
    const [isConfirmHovered, setIsConfirmHovered]   = useState(false);
    const anchorRef                                 = useRef<HTMLDivElement>(null);

    const spaces            = useSpaceStore((s) => s.spaces);
    const activeSpaceId     = useSpaceStore((s) => s.activeSpaceId);
    const setActiveSpace    = useSpaceStore((s) => s.setActiveSpace);
    const openModal         = useUIStore((s) => s.openModal);
    
    const activeSpace = spaces.find((space) => space.id === activeSpaceId);
    const ActiveIcon  = getSpaceIcon(activeSpace?.icon);

    useEffect(() => {
        if (!isOpen) return;

        const handleMouseDown = (e: MouseEvent) => {
            if (anchorRef.current?.contains(e.target as Node)) return;
            setIsOpen(false);
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("mousedown", handleMouseDown, true);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    return (
        <div ref={anchorRef} className="relative">
            <button
                onClick={() => setIsOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm cursor-pointer"
                style={{
                    background: "var(--color-surface)",
                    border: "0.5px solid var(--color-border-accent)",
                    borderRadius: 8,
                    padding: "5px 10px",
                    color: "var(--color-text)",
                }}
            >
                <ActiveIcon size={14} color={activeSpace?.color ?? "var(--color-accent)"} />
                {activeSpace?.name ?? "Personal"}
                <ChevronDown
                    size={12}
                    color="var(--color-accent-light)"
                    style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                    }}
                />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 6px)", // calc is short for calculate btw chat
                        left: 0,
                        width: 220,
                        background: "var(--color-surface)",
                        border: "0.5px solid var(--color-border)",
                        borderRadius: 10,
                        padding: "4px 0",
                        zIndex: 200,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                >
                    <div style={{ maxHeight: 260, overflowY: "auto" }}>
                        {spaces.map((space) => (
                            <SpaceRow
                                key={space.id}
                                space={space}
                                isActive={space.id === activeSpaceId}
                                onSelect={() => {
                                    setActiveSpace(space.id);
                                    setIsOpen(false);
                                }}
                                onEdit={() => {
                                    openModal("manage-space", space.id);
                                    setIsOpen(false);
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ height: "0.5px", margin: "4px 0", background: "var(--color-border)" }} />

                    <button
                        onClick={() => {
                            openModal("manage-space", null);
                            setIsOpen(false);
                        }}
                        className="flex items-center gap-2 w-full cursor-pointer"
                        style={{
                            background: isConfirmHovered ? "var(--color-surface-raised)" : "transparent",
                            border: "none",
                            padding: "6px 12px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            color: "var(--color-text)",
                        }}
                        onMouseEnter={() => setIsConfirmHovered(true)}
                        onMouseLeave={() => setIsConfirmHovered(false)}
                    >
                        <Plus size={15} color={isConfirmHovered ? "var(--color-accent)" : "var(--color-text-muted)"} />
                        New Space
                    </button>
                </div>
            )}
        </div>
    );
}

function SpaceRow({
    space,
    isActive,
    onSelect,
    onEdit,
}: {
    space:      ReturnType<typeof useSpaceStore.getState>["spaces"][number];
    isActive:   boolean;
    onSelect:   () => void;
    onEdit:     () => void;
}) {
    const [hovered, setHovered]             = useState(false);
    const [isEditHovered, setIsEditHovered] = useState(false);
    const Icon                              = getSpaceIcon(space.icon);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center gap-2"
            style={{
                background: hovered ? "var(--color-surface-raised)" : "transparent",
                padding: "6px 12px",
            }}
        >
            <button
                onClick={onSelect}
                className="flex items-center gap-2 flex-1 cursor-pointer text-left bg-transparent border-none"
                style={{ fontFamily: "inherit" }}
            >
                <Icon size={14} color={space.color ?? "var(--color-accent)"} />
                <span style={{ fontSize: 13, color: "var(--color-text)", flex: 1 }}>
                    {space.name}
                </span>
                {isActive && <Check size={13} color="var(--color-accent)" />}
            </button>

            {hovered && (
                <button
                    onClick={onEdit}
                    aria-label={`Edit ${space.name}`}
                    className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                    style={{
                        color: isEditHovered ? "var(--color-text)" : "var(--color-text-muted)",
                        flexShrink: 0,
                    }}
                    onMouseEnter={() => setIsEditHovered(true)}
                    onMouseLeave={() => setIsEditHovered(false)}
                >
                    <Pencil size={12} />
                </button>
            )}
        </div>
    );
}
