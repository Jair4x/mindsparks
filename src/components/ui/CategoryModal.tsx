//
// Category modal.
//  Three pieces, one file:
//
//  CategoryModal: router. Reads activeModal from the store and mounts whichever of the two below applies.
//                 Used by callers that go through the store (at the time of this update: only SparkModal, for a single node.)
//
//  AssignCategoryModal: reusable, prop-driven. Give it targetNodes (1 or many) and it handles picking
//                       an existing category or creating a new one and assigning it, no store dependency
//                       on WHO the targets are. Used by the router above, AND directly by ContextMenu.tsx
//                       for its (possibly multi-node) selection, without going through activeModal at all.
//
//  ManageCategoryModal: pure category administration (create/rename/recolor), no assignment involved.
//

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import { Pencil, X, Plus, Check, ArrowLeft, Trash2 as Trash } from "lucide-react";
import { useUIStore, useCategoryStore, useSpaceStore, useSparkStore, useFlameStore } from "../../store";
import type { Category } from "../../types";
import type { SelectedNode } from "../../store";
import { useAssignCategory } from "../../hooks/useAssignCategory";

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
// CategoryModal (router)
// --------------------------

export function CategoryModal() {
    const activeModal           = useUIStore((s) => s.activeModal);
    const activeModalNodeId     = useUIStore((s) => s.activeModalNodeId);
    const closeModal            = useUIStore((s) => s.closeModal);

    // activeModalNodeId doesn't carry its own type, so we resolve it
    // against both store, same thing the old single-file version did.
    const sparksAll = useSparkStore((s) => s.sparks);
    const flamesAll = useFlameStore((s) => s.flames);

    if (activeModal === "assign-category") {
        // Big ugly multiple terniary operations to find the correct selected nodes
        const targetNodes: SelectedNode[] = activeModalNodeId
            ? sparksAll.some((sp) => sp.id === activeModalNodeId)
                ? [{ id: activeModalNodeId, type: "spark" }]
                : flamesAll.some((f) => f.id === activeModalNodeId)
                    ? [{ id: activeModalNodeId, type: "flame" }]
                    : []
            : [];
        
        return <AssignCategoryModal targetNodes={targetNodes} onClose={closeModal} />;
    }

    if (activeModal === "manage-category") {
        return <ManageCategoryModal onClose={closeModal} />;
    }

    return null;
}

// --------------------------
// AssignCategoryModal
//  The reusable piece. Doesn't know or care whether it was opened via
//  the store (CategoryModal above) or mounted directly by a caller that already
//  has its own target nodes (ContextMenu).
// --------------------------

export function AssignCategoryModal({
    targetNodes,
    onClose,
    startInCreateForm = false,
}: {
    targetNodes:        SelectedNode[];
    onClose:            () => void;
    startInCreateForm?: boolean;
}) {
    const activeSpaceId         = useSpaceStore((s) => s.activeSpaceId);
    const categories            = useCategoryStore(useShallow((s) => s.getCategoriesBySpace(activeSpaceId)));
    const createCategory        = useCategoryStore((s) => s.createCategory);
    const renameCategory        = useCategoryStore((s) => s.renameCategory);
    const updateCategoryColor   = useCategoryStore((s) => s.updateCategoryColor);
    const assignCategory        = useAssignCategory();
    
    const sparksAll = useSparkStore((s) => s.sparks);
    const flamesAll = useFlameStore((s) => s.flames);

    // Only meaningful to highlight a "current" category when there's
    // exactly one target. With several, there isn't a single truth to show.
    const currentCategoryId = targetNodes.length === 1
        ? (targetNodes[0].type === "spark"
            ? sparksAll.find((sp) => sp.id === targetNodes[0].id)?.categoryId
            : flamesAll.find((f) => f.id === targetNodes[0].id)?.categoryId)
        : undefined;
    
    const handleAssign = (categoryId: string | undefined) => {
        assignCategory(targetNodes, categoryId);
        onClose();
    };

    return (
        <CategoryModalContent
            mode="assign"
            categories={categories}
            currentCategoryId={currentCategoryId}
            onClose={onClose}
            onSelect={handleAssign}
            onSave={(id, name, color) => {
                renameCategory(id, name);
                updateCategoryColor(id, color);
            }}
            onCreate={(name, color) => {
                const newCategory = createCategory({ name, color, spaceId: activeSpaceId });
                handleAssign(newCategory.id);
            }}
            initialView={startInCreateForm ? "form" : "list"}
        />
    );
}

// --------------------------
// ManageCategoryModal
//  Pure administration: create, rename, delete, recolor. Never assigns anything.
// --------------------------

function ManageCategoryModal({ onClose }: { onClose: () => void }) {
    const activeSpaceId         = useSpaceStore((s) => s.activeSpaceId);
    const categories            = useCategoryStore(useShallow((s) => s.getCategoriesBySpace(activeSpaceId)));
    const createCategory        = useCategoryStore((s) => s.createCategory);
    const renameCategory        = useCategoryStore((s) => s.renameCategory);
    const updateCategoryColor   = useCategoryStore((s) => s.updateCategoryColor);
    const deleteCategory        = useCategoryStore((s) => s.deleteCategory);
    
    return (
        <CategoryModalContent
            mode="manage"
            categories={categories}
            onClose={onClose}
            onSelect={() => { }} // "manage" mode's list never calls onSelect, so no Check/assign shown
            onSave={(id, name, color) => {
                renameCategory(id, name);
                updateCategoryColor(id, color);
            }}
            onCreate={(name, color) => {
                createCategory({ name, color, spaceId: activeSpaceId });
            }}
            onDelete={deleteCategory}
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
    onDelete,
    initialView = "list",
}: {
    mode:                   CategoryModalMode;
    categories:             Category[];
    currentCategoryId?:     string;
    onClose:                () => void;
    onSelect:               (categoryId: string | undefined) => void;
    onSave:                 (id: string, name: string, color: string) => void;
    onCreate:               (name: string, color: string) => void;
    onDelete?:              (categoryId: string) => void;
    initialView?:           "list" | "form";
}) {
    const [view, setView]                           = useState<"list" | "form" | "confirm-delete">(initialView);
    const [editingCategory, setEditingCategory]     = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory]   = useState<Category | null>(null);
    const overlayRef                                = useRef<HTMLDivElement>(null);

    const backToList = () => {
        setView("list");
        setEditingCategory(null);
        setDeletingCategory(null);
    };

    const openCreateForm = () => {
        setView("form");
        setEditingCategory(null);
    };

    const openEditForm = (category: Category) => {
        setView("form");
        setEditingCategory(category);
    };

    const openDeleteConfirm = (category: Category) => {
        setView("confirm-delete");
        setDeletingCategory(category);
    };

    const confirmDelete = () => {
        if (deletingCategory) onDelete?.(deletingCategory.id);
        backToList();
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (view === "form" || view === "confirm-delete") backToList();
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
        : view === "form"
            ? (editingCategory ? "Edit category" : "New category")
            : "Delete category";

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "var(--color-overlay)"}}
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
                        borderBottom: "0.5px solid var(--color-border)",
                        flexShrink: 0,
                    }}
                >
                    <div className="flex items-center gap-2">
                        {(view === "form" || view === "confirm-delete") && (
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
                        onDeleteCategory={onDelete ? openDeleteConfirm : undefined}
                    />
                ) : view === "form" ? (
                    <CategoryForm
                        isEditing={!!editingCategory}
                        initialName={editingCategory?.name ?? ""}
                        initialColor={editingCategory?.color ?? PRESET_COLORS[0]}
                        onConfirm={handleFormConfirm}
                        onCancel={backToList}
                    />
                ) : (
                    deletingCategory && (
                        <CategoryDeleteConfirm
                            category={deletingCategory}
                            onConfirm={confirmDelete}
                            onCancel={backToList}
                        />
                    )
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
    onDeleteCategory,
}: {
    mode:               CategoryModalMode;
    categories:         Category[];
    currentCategoryId?: string;
    onSelectCategory:   (categoryId: string | undefined) => void;
    onEditCategory:     (category: Category) => void;
    onCreateNew:        () => void;
    onDeleteCategory?:  (category: Category) => void;
}) {
    return (
        <div className="px-5 py-4 flex flex-col gap-3 overflow-auto">
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                {mode === "assign" ? "CATEGORIES" : "YOUR CATEGORIES"}
            </div>

            {mode === "assign" && (
                <button
                    onClick={() => onSelectCategory(undefined)}
                    className="flex items-center gap-2.5 cursor-pointer w-full text-left"
                    style={{
                        background: "transparent",
                        border: "0.5px dashed var(--color-border)",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontFamily: "inherit",
                    }}
                >
                    <span
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            border: "1.5px dashed var(--color-text-muted)",
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)", flex: 1 }}>
                        No category
                    </span>
                </button>
            )}
            
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
                            onDelete={onDeleteCategory ? () => onDeleteCategory(category) : undefined}
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
    onDelete,
}: {
    category:   Category;
    mode:       CategoryModalMode;
    isSelected: boolean;
    onClick:    () => void;
    onDelete?:  () => void;
}) {
    const [hovered, setHovered]             = useState(false);
    const [editHovered, setEditHovered]     = useState(false);
    const [trashHovered, setTrashHovered]   = useState(false);

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
                <div className="flex items-center gap-2">
                    <Pencil
                        size={12}
                        style={{
                            opacity: hovered ? 1 : 0.4,
                            transition: "opacity 0.15s",
                            color: editHovered ? "var(--color-text)" : "var(--color-text-muted)",
                        }}
                        onMouseEnter={() => setEditHovered(true)}
                        onMouseLeave={() => setEditHovered(false)}
                    />

                    {onDelete && (
                        <span
                            role="button"
                            aria-label={`Delete ${category.name}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="flex items-center justify-center cursor-pointer"
                            style={{ opacity: hovered ? 1 : 0.4, transition: "opacity 0.15s" }}
                        >
                            <Trash
                                size={12}
                                style={{
                                    color: trashHovered ? "var(--color-danger)" : "var(--color-danger-dark)",
                                }}
                                onMouseEnter={() => setTrashHovered(true)}
                                onMouseLeave={() => setTrashHovered(false)}
                            />
                        </span>
                    )}
                </div>
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
                                border: "2px solid var(--color-border-accent)",
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
                                            ? "2px solid var(--color-accent)"
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
                                    border: isCustom ? "2px solid var(--color-accent)" : "2px solid var(--color-border)",
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
                        background: isCancelBtnHovered ? "var(--color-surface-raised)" : "transparent",
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

// --------------------------
// CategoryDeleteConfirm
// --------------------------

function CategoryDeleteConfirm({
    category,
    onConfirm,
    onCancel,
}: {
    category:   Category;
    onConfirm:  () => void;
    onCancel:   () => void;
}) {
    const [isConfirmHovered, setIsConfirmHovered]   = useState(false);
    const [isCancelHovered, setIsCancelHovered]     = useState(false);

    return (
        <>
            <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                    <span
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: category.color,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                        {category.name}
                    </span>
                </div>

                <div style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                    {/* Plain HTML, I'll 100% change it later, probably, maybe. */}

                    <b>Are you sure you want to delete this category?</b>
                    <br />
                    <br />
                    The sparks and flames that have it assigned are gonna lose it.
                    <br />
                    <i>(This action can't be reverted)</i>
                </div>
            </div>

            <div
                className="flex justify-end gap-2 px-5 py-3"
                style={{ borderTop: "0.5px solid var(--color-border)"}}
            >
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
                    onClick={onConfirm}
                    onMouseEnter={() => setIsConfirmHovered(true)}
                    onMouseLeave={() => setIsConfirmHovered(false)}
                    className="border-none text-white cursor-pointer"
                    style={{
                        background: isConfirmHovered ? "var(--color-danger)" : "var(--color-danger-dark)",
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 13,
                        fontFamily: "inherit",
                        transition: "background 0.15s",
                    }}
                >
                    Delete
                </button>
            </div>
        </>
    );
}