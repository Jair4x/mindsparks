//
// Space Modal. Pure administration (create/rename/recolor/delete icon+color)
//
// Same style as CategoryModal, but adapted for Space's needs.
//

import { useEffect, useRef, useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { useUIStore, useSpaceStore } from "../../store";
import type { Space } from "../../types";
import { SPACE_ICONS, getSpaceIcon } from "../../lib/spaceIcons";

const PRESET_COLORS = [
    // Light colors
    "#F25555", "#F28C35", "#F2C94C", "#4ECB71",
    "#36CFC9", "#4DA6FF", "#9B6DFF", "#F26DB5",

    // Dark colors
    "#D44E3E", "#D4783E", "#B8900A", "#27AE60",
    "#1E9E98", "#1F618D", "#7D3C98", "#A93175",
];

// --------------------------
// SpaceModal (router)
// --------------------------

export function SpaceModal() {
    const activeModal       = useUIStore((s) => s.activeModal);
    const activeModalNodeId = useUIStore((s) => s.activeModalNodeId);
    const closeModal        = useUIStore((s) => s.closeModal);
    const spaces            = useSpaceStore((s) => s.spaces);

    if (activeModal !== "manage-space") return null;

    const editingSpace = activeModalNodeId
        ? spaces.find((space) => space.id === activeModalNodeId) ?? null
        : null;
    
    return <SpaceModalContent space={editingSpace} onClose={closeModal} />;
}

// --------------------------
// SpaceModalContent
// --------------------------

function SpaceModalContent({
    space,
    onClose,
}: {
    space:      Space | null; // null = creating a new Space
    onClose:    () => void;
}) {
    const [view, setView]                       = useState<"form" | "confirm-delete">("form");
    const [isCloseHovered, setIsCloseHovered]   = useState(false);
    const overlayRef                            = useRef <HTMLDivElement>(null);
    const mouseDownOnOverlay                    = useRef(false);
    
    const createSpace       = useSpaceStore((s) => s.createSpace);
    const renameSpace       = useSpaceStore((s) => s.renameSpace);
    const updateSpaceIcon   = useSpaceStore((s) => s.updateSpaceIcon);
    const updateSpaceColor  = useSpaceStore((s) => s.updateSpaceColor);
    const deleteSpace       = useSpaceStore((s) => s.deleteSpace);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            
            if (view === "confirm-delete") setView("form");
            else onClose();
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose, view]);

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        mouseDownOnOverlay.current = e.target === overlayRef.current;
    };

    const handleOverlayMouseUp = (e: React.MouseEvent) => {
        if (mouseDownOnOverlay.current && e.target === overlayRef.current) onClose();
    };

    const handleFormConfirm = (name: string, icon: string, color: string) => {
        if (space) {
            renameSpace(space.id, name);
            updateSpaceIcon(space.id, icon);
            updateSpaceColor(space.id, color);
        } else {
            createSpace({ name, icon, color });
        }
        onClose();
    };

    const handleDeleteConfirm = () => {
        if (space) deleteSpace(space.id);
        onClose();
    }

    const headerTitle = view === "confirm-delete"
        ? "Delete Space"
        : space ? "Edit Space" : "New Space";
    
    return (
        <div
            ref={overlayRef}
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "var(--color-overlay)" }}
        >
            <div
                className="flex flex-col overflow-hidden"
                style={{
                    background: "var(--color-surface)",
                    border: "0.5px solid var(--color-border)",
                    borderRadius: 16,
                    width: 360,
                    maxHeight: "80vh",
                    boxShadow: "0 8px 32px var(--color-shadow)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5"
                    style={{
                        height: 48,
                        bottom: "0.5px solid var(--color-border)",
                        flexShrink: 0,
                    }}
                >
                    <div className="flex items-center gap-2">
                        {view === "confirm-delete" && (
                            <button
                                onClick={() => setView("form")}
                                aria-label="Back to Space"
                                className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                                style={{ color: "var(--color-text-muted)", borderRadius: 6, padding: 2 }}
                            >
                                <ArrowLeft size={15} />
                            </button>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                            {headerTitle}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                        style={{
                            color: isCloseHovered ? "var(--color-text)" : "var(--color-text-muted)",
                            borderRadius: 6,
                            padding: 2
                        }}
                        onMouseEnter={() => setIsCloseHovered(true)}
                        onMouseLeave={() => setIsCloseHovered(false)}
                    >
                        <X size={15} />
                    </button>
                </div>

                {view === "form" ? (
                    <SpaceForm
                        isEditing={!!space}
                        canDelete={!!space && !space.isDefault}
                        initialName={space?.name ?? ""}
                        initialIcon={space?.icon ?? SPACE_ICONS[0]}
                        initialColor={space?.color ?? PRESET_COLORS[0]}
                        onConfirm={handleFormConfirm}
                        onCancel={onClose}
                        onDeleteRequested={() => setView("confirm-delete")}
                    />
                ): (
                    space && (
                        <SpaceDeleteConfirm
                            space={space}
                            onConfirm={handleDeleteConfirm}
                            onCancel={() => setView("form")}
                        />
                    )    
                )}
            </div>
        </div>
    );
}

// --------------------------
// SpaceForm
// --------------------------

function SpaceForm({
    isEditing,
    canDelete,
    initialName,
    initialIcon,
    initialColor,
    onConfirm,
    onCancel,
    onDeleteRequested,
}: {
    isEditing: boolean;
    canDelete: boolean;
    initialName: string;
    initialIcon: string;
    initialColor: string;
    onConfirm: (name: string, icon: string, color: string) => void;
    onCancel: () => void;
    onDeleteRequested: () => void;
}) {
    const [name, setName]                           = useState(initialName);
    const [icon, setIcon]                           = useState(initialIcon);
    const [color, setColor]                         = useState(initialColor);
    const [isCustomColor, setIsCustomColor]         = useState(!PRESET_COLORS.includes(initialColor));
    const [isCancelHovered, setIsCancelHovered]     = useState(false);
    const [isConfirmHovered, setIsConfirmHovered]   = useState(false);
    const [isDeleteHovered, setIsDeleteHovered]     = useState(false);
    const nameInputRef                              = useRef<HTMLInputElement>(null);

    useEffect(() => {
        nameInputRef.current?.focus();
    }, []);

    const canConfirm = name.trim().length > 0;
    const PreviewIcon = getSpaceIcon(icon);

    return (
        <>
            {/* Body */}
            <div className="px-5 py-4 flex flex-col gap-4 overflow-auto">
                {/* Name field */}
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="space-name" style={{ fontSize: 12, color: "var(--color-text-muted)"}}>
                        NAME
                    </label>

                    <input
                        id="space-name"
                        ref={nameInputRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Cool space name..."
                        style={{
                            background: "var(--color-surface-raised)",
                            border: "0.5px solid var(--color-border)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 13,
                            color: "var(--color-text)",
                            fontFamily: "inherit",
                            outline: "none",
                            width: "100%",
                        }}
                    />
                </div>

                {/* Icon picker */}
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, color: "var(--color-text-muted)"}}>
                        ICON
                    </label>
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "var(--color-surface-raised)",
                                border: "2px solid var(--color-border-accent)",
                            }}
                        >
                            <PreviewIcon size={18} color={color} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
                            {SPACE_ICONS.map((iconName) => {
                                const IconOption = getSpaceIcon(iconName);
                                const isSelected = icon === iconName;

                                return (
                                    <button
                                        key={iconName}
                                        onClick={() => setIcon(iconName)}
                                        title={iconName}
                                        className="flex items-center justify-center cursor-pointer"
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 6,
                                            background: "var(--color-border)",
                                            border: isSelected ? "1px solid var(--color-accent)" : "1px solid transparent",
                                            transition: "border-color 0.15s",
                                        }}
                                    >
                                        <IconOption size={15} color="var(--color-text)" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Color picker */}
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                        COLOR
                    </label>
                    <div className="flex items-center gap-3">
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: color,
                                flexShrink: 0,
                                border: "2px solid var(--color-border-accent)",
                            }}
                        />

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
                            {PRESET_COLORS.map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => {
                                        setColor(preset);
                                        setIsCustomColor(false);
                                    }}
                                    title={preset}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        background: preset,
                                        border: color === preset && !isCustomColor
                                            ? "2px solid var(--color-accent)"
                                            : "2px solid transparent",
                                        cursor: "pointer",
                                        transition: "border-color 0.15s",
                                    }}
                                />
                            ))}

                            <label
                                title="Custom color"
                                className="flex cursor-pointer items-center justify-center"
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: isCustomColor ? color : "var(--color-surface-raised)",
                                    border: isCustomColor ? "2px solid var(--color-accent)" : "2px solid var(--color-border)",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => {
                                        setColor(e.target.value);
                                        setIsCustomColor(true);
                                    }}
                                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {canDelete && (
                    <button
                        onClick={onDeleteRequested}
                        className="cursor-pointer text-left bg-transparent border-none mt-4"
                        style={{
                            fontSize: 12,
                            color: isDeleteHovered ? "var(--color-danger-dark)" : "var(--color-danger)",
                            padding: 0,
                            alignSelf: "flex-start"
                        }}
                        onMouseEnter={() => setIsDeleteHovered(true)}
                        onMouseLeave={() => setIsDeleteHovered(false)}
                    >
                        Delete this Space
                    </button>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "0.5px solid var(--color-border)" }}>
                <button
                    onClick={onCancel}
                    className="cursor-pointer"
                    style={{
                        background: isCancelHovered ? "var(--color-surface-raised)" : "transparent",
                        border: "0.5px solid var(--color-border)",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 13,
                        color: isCancelHovered ? "white" : "var(--color-text-muted)",
                        fontFamily: "inherit",
                    }}
                    onMouseEnter={() => setIsCancelHovered(true)}
                    onMouseLeave={() => setIsCancelHovered(false)}
                >
                    Cancel
                </button>

                <button
                    onClick={() => canConfirm && onConfirm(name.trim(), icon, color)}
                    disabled={!canConfirm}
                    className="border-none"
                    style={{
                        background: !canConfirm
                            ? "var(--color-border)"
                            : isConfirmHovered
                                ? "var(--color-accent-dark)"
                                : "var(--color-accent)",
                        borderRadius: 6,
                        color: !canConfirm ? "var(--color-text-muted)" : "white",
                        padding: "6px 14px",
                        fontSize: 13,
                        fontFamily: "inherit",
                        cursor: !canConfirm ? "not-allowed" : "pointer",
                    }}
                    onMouseEnter={() => setIsConfirmHovered(true)}
                    onMouseLeave={() => setIsConfirmHovered(false)}
                >
                    {isEditing ? "Save" : "Create"}
                </button>
            </div>
        </>
    );
}

// --------------------------
// SpaceDeleteConfirm
//  This is kind of a joke, but since since a Space is something that deletes a bunch of stuff,
//  why not make it a THREE-STEP deletion confirmation, with the final step being a "write the name"?
// --------------------------

function SpaceDeleteConfirm({
    space,
    onConfirm,
    onCancel
}: {
    space:      Space;
    onConfirm:  () => void;
    onCancel:   () => void;
}) {
    const [step, setStep]                           = useState<1 | 2 | 3>(1);
    const [typedName, setTypedName]                 = useState("");
    const [isCancelHovered, setIsCancelHovered]     = useState(false);
    const [isConfirmHovered, setIsConfirmHovered]   = useState(false);

    const nameMatches = typedName === space.name;

    const buttonLabels = {
        1: "Yes",
        2: "I know",
        3: "Come on, delete it already.",
    }

    return (
        <>
            <div className="px-5 py-4 flex flex-col gap-3 select-none">
                {step === 1 && (
                    <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.5 }}>
                        Are you sure you want to delete this Space?
                    </div>
                )}

                {step === 2 && (
                    <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.5 }}>
                        This Space might contain data that will be permanently lost.
                        <br />
                        <br />
                        Once gone, it can't be recovered.
                    </div>
                )}

                {step === 3 && (
                    <div className="flex flex-col gap-2">
                        <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.5 }}>
                            Are you <b>REALLY</b> sure you want to delete <b>THIS</b> Space?
                            <br />
                            Type <b style={{ color: "var(--color-accent)" }}>{space.name}</b> to confirm.
                            <br />
                            <br />
                            <i style={{ color: "var(--color-danger)"}}>This action can't be undone.</i>
                        </div>

                        <input
                            autoFocus
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder={space.name}
                            style={{
                                background: "var(--color-surface-raised)",
                                border: "0.5px solid var(--color-border)",
                                borderRadius: 8,
                                padding: "8px 12px",
                                fontSize: 13,
                                color: "var(--color-text)",
                                fontFamily: "inherit",
                                outline: "none",
                                width: "100%",
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: "0.5px solid var(--color-border)" }}>
                <button
                    onClick={onCancel}
                    className="cursor-pointer"
                    style={{
                        background: isCancelHovered ? "var(--color-surface-raised)" : "transparent",
                        border: "0.5px solid var(--color-border)",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 13,
                        color: isCancelHovered ? "var(--color-text)" : "var(--color-text-muted)",
                        fontFamily: "inherit",
                        transition: "color 0.15s, background 0.15s",
                    }}
                    onMouseEnter={() => setIsCancelHovered(true)}
                    onMouseLeave={() => setIsCancelHovered(false)}
                >
                    Cancel
                </button>

                <button
                    onClick={() => {
                        if (step === 3) {
                            if (nameMatches) onConfirm();
                        } else {
                            setStep((s) => (s + 1) as 2 | 3); // idk why the compiler cries if I don't set them as 2 or 3
                        }
                    }}
                    disabled={step === 3 && !nameMatches}
                    className="border-none cursor-pointer text-white"
                    style={{
                        background: step === 3 && !nameMatches
                            ? "var(--color-border)"
                            : isConfirmHovered ? "var(--color-danger)" : "var(--color-danger-dark)",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 13,
                        fontFamily: "inherit",
                        cursor: step === 3 && !nameMatches ? "not-allowed" : "pointer",
                        transition: "background 0.15s",
                    }}
                    onMouseEnter={() => setIsConfirmHovered(true)}
                    onMouseLeave={() => setIsConfirmHovered(false)}
                >
                    {buttonLabels[step]}
                </button>
            </div>
        </>
    );
}
