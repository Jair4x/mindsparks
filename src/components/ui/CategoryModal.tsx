//
// Category modal.
//  Two versions of the same modal, like SparkToFlameModal:
//
//  "assign-category" mode: opened from a spark/flame to pick which category it belongs to.
//      Shows a list of the space's categories as single-select buttons, plus the option to
//      create a new one (which gets assigned right away).
//
//  "manage-category" mode: opened to manage the space's categories in general.
//      The same list lets you edit an existing category, or create a new one
//

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Pencil, X, Plus, Check, ArrowLeft } from "lucide-react";
import { useUIStore, useCategoryStore, useSpaceStore, useSparkStore, useFlameStore } from "../../store";
import type { Category } from "../../types";

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

type CategoryModalMode = "assign" | "manage";

// --------------------------
// CategoryModal
// --------------------------

export function CategoryModal() {
    const activeModal           = useUIStore((s) => s.activeModal);
    const activeModalNodeId     = useUIStore((s) => s.activeModalNodeId);
    const closeModal            = useUIStore((s) => s.closeModal);

    const activeSpaceId         = useSpaceStore((s) => s.activeSpaceId);
    
    const categories            = useCategoryStore((s) => s.categories);
    const createCategory        = useCategoryStore((s) => s.createCategory);
    const renameCategory        = useCategoryStore((s) => s.renameCategory);
    const updateCategoryColor   = useCategoryStore((s) => s.updateCategoryColor);

    // activeModalNodeId is used as the spark/flame id being categorized, in "assign-category" mode.
    const spark                 = useSparkStore((s) => activeModalNodeId ? s.sparks.find((sp) => sp.id === activeModalNodeId) : undefined);
    const flame                 = useFlameStore((s) => activeModalNodeId ? s.flames.find((f) => f.id === activeModalNodeId) : undefined);
    const assignSparkCategory   = useSparkStore((s) => s.assignCategory);
    const assignFlameCategory   = useFlameStore((s) => s.assignCategory);
    
    if (activeModal !== "assign-category" && activeModal !== "manage-category") return null;

    const mode: CategoryModalMode   = activeModal === "assign-category" ? "assign" : "manage";
    const currentCategoryId         = spark?.categoryId ?? flame?.categoryId;
    
    const handleAssign = (categoryId: string | undefined) => {
        if (spark) assignSparkCategory(spark.id, categoryId);
        else if (flame) assignFlameCategory(flame.id, categoryId);

        closeModal();
    };

    return (
        <CategoryModalContent
            mode={mode}
            categories={categories}
            currentCategoryId={currentCategoryId}
            onClose={closeModal}
            onSelect={handleAssign}
            onSave={(id, name, color) => {
                renameCategory(id, name);
                updateCategoryColor(id, color);
            }}
            onCreate={(name, color) => {
                const newCategory = createCategory({ name, color, spaceId: activeSpaceId });

                if (mode === "assign") handleAssign(newCategory.id);
            }}
        />
    );
}

// --------------------------
// CategoryModalContent
// --------------------------

function CategoryModalContent({
    mode,
    categories,
    currentCategoryId,
    onClose,
    onSelect,
    onSave,
    onCreate,
}: {
    mode:                   CategoryModalMode;
    categories:             Category[];
    currentCategoryId?:     string;
    onClose:                () => void;
    onSelect:               (categoryId: string | undefined) => void;
    onSave:                 (id: string, name: string, color: string) => void;
    onCreate:               (name: string, color: string) => void;
}) {
    const [view, setView]                           = useState<"list" | "form">("list");
    const [editingCategory, setEditingCategory]     = useState<Category | null>(null);
    const overlayRef                                = useRef<HTMLDivElement>(null);

    const backToList = () => {
        setView("list");
        setEditingCategory(null);
    };

    const openCreateForm = () => {
        setView("form");
        setEditingCategory(null);
    };

    const openEditForm = (category: Category) => {
        setView("form");
        setEditingCategory(category);
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (view === "form") backToList();
            else onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose, view]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleFormConfirm = (name: string, color: string) => {
        if (editingCategory) {
            // Editing always returns to the list, both modes can get here
            // since clicking a category in manage mode opens it for editing.
            onSave(editingCategory.id, name, color);
            backToList();
        } else {
            onCreate(name, color);

            // Assign mode closes the modal itself via onSelect (inside onCreate).
            // Manage mode here stays open and goes back to the list to keep managing.
            if (mode === "manage") backToList();
        }
    };

    const headerTitle = view === "list"
        ? (mode === "assign" ? "Assign category" : "Manage categories")
        : (editingCategory ? "Edit category" : "New category");

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
                    maxHeight: "80vh",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-5"
                    style={{
                        height: 48,
                        borderBottom: "0.5px solid var(--color-border)",
                        flexShrink: 0,
                    }}
                >
                    <div className="flex items-center gap-2">
                        {view === "form" && (
                            <button
                                onClick={backToList}
                                aria-label="Back to categories"
                                className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                                style={{
                                    color: "var(--color-text-muted)",
                                    borderRadius: 6,
                                    padding: 2,
                                }}
                            >
                                <ArrowLeft size={15} />
                            </button>
                        )}
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "var(--color-text)",
                            }}
                        >
                            {headerTitle}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
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
 
                {view === "list" ? (
                    <CategoryListView
                        mode={mode}
                        categories={categories}
                        currentCategoryId={currentCategoryId}
                        onSelectCategory={onSelect}
                        onEditCategory={openEditForm}
                        onCreateNew={openCreateForm}
                    />
                ) : (
                    <CategoryForm
                        isEditing={!!editingCategory}
                        initialName={editingCategory?.name ?? ""}
                        initialColor={editingCategory?.color ?? PRESET_COLORS[0]}
                        onConfirm={handleFormConfirm}
                        onCancel={backToList}
                    />
                )}
            </div>
        </div>
    );
}

// --------------------------
// CategoryListView
//  Shown in both modes. Behavior on clicking a category differs:
//  - assign: (de)selects it as the category to assign.
//  - manage: opens it for editing.
// --------------------------

function CategoryListView({
    mode,
    categories,
    currentCategoryId,
    onSelectCategory,
    onEditCategory,
    onCreateNew,
}: {
    mode:               CategoryModalMode;
    categories:         Category[];
    currentCategoryId?: string;
    onSelectCategory:   (categoryId: string | undefined) => void;
    onEditCategory:     (category: Category) => void;
    onCreateNew:        () => void;
}) {
    return (
        <div className="px-5 py-4 flex flex-col gap-3 overflow-auto">
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {mode === "assign" ? "CATEGORIES" : "YOUR CATEGORIES"}
            </div>
            
            {categories.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "4px 0 8px" }}>
                    No categories yet
                </div>
            ) : (
                <div className="flex flex-col gap-1.5" style={{ maxHeight: 260, overflowY: "auto" }}>
                    {categories.map((category) => (
                        <CategoryListItem
                            key={category.id}
                            category={category}
                            mode={mode}
                            isSelected={mode === "assign" && category.id === currentCategoryId}
                            onClick={() => mode === "assign"
                                ? onSelectCategory(category.id === currentCategoryId ? undefined : category.id)
                                : onEditCategory(category)
                            }
                        />
                    ))}
                </div>
            )}

            <button
                onClick={onCreateNew}
                className="flex items-center gap-2 cursor-pointer w-full text-left"
                style={{
                    background: "transparent",
                    border: "0.5px dashed var(--color-border)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    fontFamily: "inherit",
                }}
            >
                <Plus size={14} />
                New
            </button>
        </div>
    );
}

// --------------------------
// CategoryListItem
// --------------------------

function CategoryListItem({
    category,
    mode,
    isSelected,
    onClick,
}: {
    category:   Category;
    mode:       CategoryModalMode;
    isSelected: boolean;
    onClick:    () => void;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center gap-2.5 cursor-pointer w-full text-left"
            style={{
                background: isSelected || hovered ? "var(--color-surface-raised)" : "transparent",
                border: `0.5px solid ${isSelected ? category.color : "var(--color-border)"}`,
                borderRadius: 8,
                padding: "8px 12px",
                fontFamily: "inherit",
                transition: "border-color 0.15s, background 0.15s",
            }}
        >
            <span
                style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: category.color,
                    flexShrink: 0,
                }}
            />

            <span style={{ fontSize: 13, color: "var(--color-text)", flex: 1 }}>
                {category.name}
            </span>

            {mode === "assign" && isSelected && (
                <Check size={13} color={category.color} />
            )}

            {mode === "manage" && (
                <Pencil
                    size={12}
                    color="var(--color-text-muted)"
                    style={{ opacity: hovered ? 1 : 0.4, transition: "opacity 0.15s" }}
                />
            )}
        </button>
    );
}

// --------------------------
// CategoryForm
//  Name + color fields, used both for creating and editing a category.
// --------------------------

function CategoryForm({
    isEditing,
    initialName,
    initialColor,
    onConfirm,
    onCancel,
}: {
    isEditing:      boolean;
    initialName:    string;
    initialColor:   string;
    onConfirm:      (name: string, color: string) => void;
    onCancel:       () => void;
}) {
    const [name, setName]                               = useState(initialName);
    const [color, setColor]                             = useState(initialColor);
    const [isCustom, setIsCustom]                       = useState(!PRESET_COLORS.includes(initialColor));
    const [isCancelBtnHovered, setIsCancelBtnHovered]   = useState(false);
    const nameInputRef                                  = useRef<HTMLInputElement>(null);
 
    // Autofocus name field
    useEffect(() => {
        nameInputRef.current?.focus();
    }, []);
 
    const canConfirm = name.trim().length > 0;
 
    return (
        <>
            {/* Body */}
            <div className="px-5 py-4 flex flex-col gap-4 overflow-auto">
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
                    onClick={onCancel}
                    className="cursor-pointer"
                    style={{
                        background: isCancelBtnHovered ? "var(--color-accent)" : "transparent",
                        border: "0.5px solid var(--color-border)",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 13,
                        color: isCancelBtnHovered ? "white" : "var(--color-text-muted)",
                        fontFamily: "inherit",
                    }}
                    onMouseEnter={() => setIsCancelBtnHovered(true)}
                    onMouseLeave={() => setIsCancelBtnHovered(false)}
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
        </>
    );
}