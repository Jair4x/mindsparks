//
// Category creating/editing modal.
//
//

import { useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { useUIStore, useCategoryStore, useSpaceStore } from "../../store";

// --------------------------
// Color pallete
//  The list of preset colors to choose when creating/editing a category
// --------------------------

const PRESET_COLORS = [
    // Light colors
    "#F25555", "#F28C35", "#F2C94C", "#4ECB71",
    "#36CFC9", "#4DA6FF", "#9B6DFF", "#F26DB5",

    // Dark colors
    "#D44E3E", "#D4783E", "#B8900A", "#27AE60",
    "#1E9E98", "#1F618D", "#7D3C98", "#A93175",
];

// --------------------------
// CategoryModal
// --------------------------

export function CategoryModal() {
    const activeModal           = useUIStore((s) => s.activeModal);
    const activeModalNodeId     = useUIStore((s) => s.activeModalNodeId);
    const closeModal            = useUIStore((s) => s.closeModal);

    const activeSpaceId         = useSpaceStore((s) => s.activeSpaceId);
    const createCategory        = useCategoryStore((s) => s.createCategory);
    const categories            = useCategoryStore((s) => s.categories);

    // activeModalNodeId is used as categoryId when editing
    const existingCategory      = categories.find((c) => c.id === activeModalNodeId);
    const isEditing             = existingCategory ? true : false;
    
    const renameCategory        = useCategoryStore((s) => s.renameCategory);
    const updateCategoryColor   = useCategoryStore((s) => s.updateCategoryColor);

    if (activeModal !== "category-form") return null;

    return (
        <CategoryModalContent
            isEditing={isEditing}
            initialName={existingCategory?.name ?? ""}
            initialColor={existingCategory?.color ?? PRESET_COLORS[0]}
            onClose={closeModal}
            onConfirm={(name, color) => {
                if (isEditing && existingCategory) {
                    renameCategory(existingCategory.id, name);
                    updateCategoryColor(existingCategory.id, color);
                } else {
                    createCategory({ name, color, spaceId: activeSpaceId });
                }

                closeModal();
            }}
        />
    );
}

// --------------------------
// CategoryModalContent
// --------------------------

function CategoryModalContent({
    isEditing,
    initialName,
    initialColor,
    onClose,
    onConfirm,
}: {
    isEditing:      boolean;
    initialName:    string;
    initialColor:   string;
    onClose:        () => void;
    onConfirm:      (name: string, color: string) => void;
}) {
    const [name, setName]           = useState(initialName);
    const [color, setColor]         = useState(initialColor);
    const [isCustom, setIsCustom]   = useState(false);
    const overlayRef                = useRef<HTMLDivElement>(null);
    const nameInputRef              = useRef<HTMLInputElement>(null);

    // Autofocus name field
    useEffect(() => {
        nameInputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const canConfirm = name.trim().length > 0;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.5)"}}
        >
            <div
                className="flex flex-col overflow-hidden"
                style={{
                    background: "var(--color-surface)",
                    border: "0.5px solid var(--color-border)",
                    borderRadius: 16,
                    width: 360,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5"
                    style={{
                        height: 48,
                        borderBottom: "0.5px solid var(--color-border)",
                    }}
                >
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "var(--color-text)",
                        }}
                    >
                        {isEditing ? "Edit category" : "New category"}
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                        style={{
                            color: "var(--color-text-muted)",
                            borderRadius: 6,
                            padding: 2,
                        }}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex flex-col gap-4">
                    {/* Name field */}
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="category-name"
                            style={{ fontSize: 11, color: "var(--color-text-muted)" }}
                        >
                            NAME
                        </label>
                        <input
                            id="category-name"
                            ref={nameInputRef}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Category name..."
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

                    {/* Color picker */}
                    <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            COLOR
                        </label>

                        {/* Preview + palette */}
                        <div className="flex items-center gap-3">
                            {/* Selected color preview */}
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: color,
                                    flexShrink: 0,
                                    border: "2px solid rgba(255,255,255,0.15)",
                                }}
                            />

                            {/* Preset circles */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(8, 1fr)",
                                    gap: 6,
                                }}
                            >
                                {PRESET_COLORS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => {
                                            setColor(preset);
                                            setIsCustom(false);
                                        }}
                                        title={preset}
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: "50%",
                                            background: preset,
                                            border: color === preset && !isCustom
                                                ? "2px solid #fff"
                                                : "2px solid transparent",
                                            cursor: "pointer",
                                            transition: "border-color 0.15s",
                                        }}
                                    />
                                ))}

                                {/* Custom color button */}
                                <label
                                    title="Custom color"
                                    className="flex cursor-pointer items-center justify-center"
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: "50%",
                                        background: isCustom ? color : "var(--color-surface-raised)",
                                        border: isCustom ? "2px solid #fff" : "2px solid var(--color-border)",
                                        color: "var(--color-text-muted)",
                                        transition: "border-color 0.15s",
                                    }}
                                >
                                    <Pencil size={11} />
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => {
                                            setColor(e.target.value);
                                            setIsCustom(true);
                                        }}
                                        style={{
                                            position: "absolute",
                                            opacity: 0,
                                            width: 0,
                                            height: 0,
                                            pointerEvents: "none",
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="flex justify-end gap-2 px-5 py-3"
                    style={{ borderTop: "0.5px solid var(--color-border)" }}
                >
                    <button
                        onClick={onClose}
                        className="bg-transparent cursor-pointer"
                        style={{
                            border: "0.5px solid var(--color-border)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 13,
                            color: "var(--color-text-muted)",
                            fontFamily: "inherit",
                        }}
                    >
                        Cancel
                    </button>
                    
                    <button
                        onClick={() => canConfirm && onConfirm(name.trim(), color)}
                        disabled={!canConfirm}
                        className="border-none text-white"
                        style={{
                            background: !canConfirm ? "var(--color-border)" : "var(--color-accent)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            cursor: !canConfirm ? "not-allowed" : "pointer",
                        }}
                    >
                        {isEditing ? "Save" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}