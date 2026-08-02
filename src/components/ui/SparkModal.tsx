//
// Modal of the details of a spark.
//  Opens when the user clicks on a spark card in the canvas.
//

import { useEffect, useRef, useState } from "react";
import { Tag, Flame, X, MoreHorizontal } from "lucide-react";
import { useSparkStore, useUIStore, useCategoryStore, useConnectionStore } from "../../store";
import { useNow, formatRelativeDate } from "../../lib/utils";
import { useChildren } from "../../lib/getChildren";

import {
    SPARK_DESC_MAX_LENGTH as DESC_MAX_LENGTH
} from "../../lib/constants";

// --------------------------
// SparkModal
// --------------------------

export function SparkModal() {
    const activeModal       = useUIStore((state) => state.activeModal);
    const activeModalNodeId = useUIStore((state) => state.activeModalNodeId);
    const closeModal        = useUIStore((state) => state.closeModal);
    
    const spark = useSparkStore((state) =>
        state.sparks.find((s) => s.id === activeModalNodeId)
    );

    if (activeModal !== "spark-detail" || !spark) return null;

    return (
        <SparkModalContent
        sparkId={spark.id}
        onClose={closeModal}
        />
    )
}

// --------------------------
// SparkModalContent
//
// Separated from SparkModal to be able to use hooks with the already validated spark.
// --------------------------
function SparkModalContent({ sparkId, onClose }: { sparkId: string; onClose: () => void }) {
    const spark             = useSparkStore((state) => state.sparks.find((s) => s.id === sparkId))!;
    const updateText        = useSparkStore((state) => state.updateSparkText);
    const updateDescription = useSparkStore((state) => state.updateSparkDescription);
    const openModal         = useUIStore((state) => state.openModal);

    const category = useCategoryStore((state) =>
        spark.categoryId ? state.categories.find((c) => c.id === spark.categoryId) : undefined
    );

    const children      = useChildren(sparkId);
    const now           = useNow();
    const overlayRef    = useRef<HTMLDivElement>(null);
    
    const [name, setName]               = useState(spark.text);
    const [description, setDescription] = useState(spark.description ?? "");
    const [notes, setNotes]             = useState("");
    const [showFamily, setShowFamily]   = useState(false);
    const [showMenu, setShowMenu]       = useState(false);
    
    // Close with Esc key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    // Save name when unfocused
    const handleNameBlur = () => {
        const trimmed = name.trim();
        if (trimmed && trimmed !== spark.text) {
            updateText(sparkId, trimmed);
        }
    };

    // Save description when unfocused
    const handleDescriptionBlur = () => {
        if (description !== (spark.description ?? "")) {
            updateDescription(sparkId, description);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    // For the family panel
    const familyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleFamilyEnter = () => {
        if (familyTimeoutRef.current) clearTimeout(familyTimeoutRef.current);
        setShowFamily(true);
    }

    const handleFamilyLeave = () => {
        familyTimeoutRef.current = setTimeout(() => setShowFamily(false), 100);
    }

    // For the "More options" menu
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showMenu]);

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{
                background: "rgba(0,0,0,0.5)",
            }}
        >
            <div
                className="flex flex-col"
                style={{
                    background: "var(--color-surface)",
                    border: `0.5px solid ${category ? category.color : "var(--color-border)"}`,
                    borderRadius: 16,
                    width: 480,
                    maxHeight: "80vh",
                    boxShadow: category ? `0 0 24px ${category.color}22` : "0 8px 32px rgba(0,0,0,0.4)",
                }}
            >
                {/*------------------------------------------
                                    Header
                ---------------------------------------------*/}
                <div
                    style={{
                        padding: "16px 16px 12px",
                        borderBottom: "0.5px solid var(--color-border)",
                    }}
                >
                    {/*
                        Upper row: name + close button
                    */}
                    <div className="flex items-start gap-2">
                        <input
                            value={name}
                            placeholder="Your idea..."
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleNameBlur}
                            className="flex flex-1 bg-transparent border-none outline-none"
                            style={{
                                fontSize: 18,
                                fontWeight: 600,
                                color: "var(--color-text)",
                                fontFamily: "inherit",
                            }}
                        />
                        <button
                            onClick={onClose}
                            aria-label="Close modal"
                            className="bg-transparent border-none cursor-pointer flex items-center p-0.5 shrink-0"
                            style={{
                                color: "var(--color-text-muted)",
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/*
                        Description
                    */}
                    <div className="flex items-center mt-1">
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX_LENGTH))}
                            onBlur={handleDescriptionBlur}
                            placeholder="Add a short description..."
                            className="w-full bg-transparent border-none outline-none mt-1"
                            style={{
                                fontSize: 13,
                                color: "var(--color-text-muted)",
                                fontFamily: "inherit",
                                resize: "none",
                            }}
                        />
                        {description.length > 0 && (
                            <div style={{ fontSize: 10, color: "var(--color-text-muted)", textAlign: "right", marginTop: 2 }}>
                                {description.length}/{DESC_MAX_LENGTH}
                            </div>
                        )}
                    </div>

                    {/*
                        Lower row: Family + creation date
                    */}
                    <div className="flex justify-end mt-2.5 select-none">
                        <div className="flex flex-col items-end gap-1">
                            {/* 
                                Family 
                            */}
                            <div
                                className="relative"
                                onMouseEnter={handleFamilyEnter}
                                onMouseLeave={handleFamilyLeave}
                            >
                                <button
                                    className="bg-transparent border-none cursor-pointer text-xs p-0"
                                    style={{
                                        fontFamily: "inherit",
                                        color: "var(--color-text-muted)",
                                    }}
                                >
                                    Family
                                </button>

                                {/* 
                                    Family panel
                                */}
                                {showFamily && (
                                    <div
                                        className="absolute top-full left-0 mt-1 min-w-40 z-10"
                                        style={{
                                            background: "var(--color-surface)",
                                            border: "0.5px solid var(--color-border)",
                                            borderRadius: 10,
                                            padding: "10px 14px",
                                            opacity: showFamily ? 1 : 0,
                                            transition: "opacity 0.15s ease",
                                        }}
                                    >
                                        {/*
                                            Parent
                                        */}
                                        {spark.parentId ? (
                                            <>
                                                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>
                                                    Parent
                                                </div>

                                                <div style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 8 }}>
                                                    {spark.parentId}
                                                </div>
                                            </>
                                        ) : null}

                                        {/*
                                            Children
                                        */}
                                        {children.length > 0 && (
                                            <>
                                                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>
                                                    Children
                                                </div>
                                                {children.map((child) => (
                                                    <div key={child.id} style={{ fontSize: 13, color: "var(--color-text)" }}>
                                                        {"text" in child ? child.text : child.name}
                                                    </div>
                                                ))}
                                            </>
                                        )}

                                        {!spark.parentId && children.length === 0 && (
                                            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                                                No family yet
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/*
                                Creation Date
                            */}
                            <div style={{ fontSize: 12, color: "var(--color-text-muted)"}}>
                                Created {formatRelativeDate(spark.createdAt, now)}
                            </div>
                        </div>
                    </div>

                    {/*
                        Action buttons
                    */}
                    <div className="flex gap-1.5 mt-3">
                        {/* Convert into flame */}
                        <ActionButton
                            icon={<Flame size={13} />}
                            label="Convert into flame"
                            onClick={() => openModal("spark-to-flame", spark.id)}
                            accent
                        />

                        {/* Category */}
                        <ActionButton
                            icon={<Tag size={13} />}
                            label="Category"
                            onClick={() => { }} // TODO: Change this when finishing on Categories
                        />

                        {/* Three dots menu */}
                        <div className="relative" ref={menuRef}>
                            <ActionButton
                                icon={<MoreHorizontal size={13} />}
                                label="More options"
                                onClick={() => setShowMenu((v) => !v)}
                                isActive={showMenu}
                            />
                            {showMenu && (
                                <div
                                    className="absolute top-full left-0 mt-1 min-w-35 z-10"
                                    style={{
                                        background: "var(--color-surface)",
                                        border: "0.5px solid var(--color-border)",
                                        borderRadius: 8,
                                        padding: "4px 0",
                                    }}
                                >
                                    {/* 
                                        TODO: Add logic for this stuff
                                    */}
                                    <MenuItem label="Create child spark" onClick={() => { }} />
                                    <MenuItem label="Duplicate" onClick={() => { }} />
                                    <MenuItem label="Archive" onClick={() => { }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/*------------------------------------------
                                Body: notes
                ---------------------------------------------*/}
                <div className="p-4 flex flex-col overflow-auto">
                    <div className="text-xs mb-2" style={{ color: "var(--color-text-muted)"}}>
                        Notes
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes, ideas or details... (Markdown supported)"
                        className="w-full min-h-30 max-h-60 leading-5 outline-none resize-none overflow-y-auto"
                        style={{
                            background: "var(--color-surface-raised)",
                            border: "0.5px solid var(--color-border)",
                            borderRadius: 8,
                            padding: "10px 12px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            color: "var(--color-text)",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}


// --------------------------
// ActionButton
// --------------------------

function ActionButton({
    icon,
    label,
    onClick,
    accent = false,
    isActive = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    accent?: boolean;
    isActive?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const active = hovered || isActive;

    return (
        <button
            aria-label={label}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center gap-1.5 border-none text-xs cursor-pointer"
            style={{
                background: accent
                    ? active ? "var(--color-accent-dark)" : "var(--color-accent)"
                    : active ? "var(--color-border)" : "var(--color-surface-raised)",
                borderRadius: 6,
                padding: "6px 10px",
                color: accent
                    ? "#fff"
                    : active ? "var(--color-text)" : "var(--color-text-muted)",
                fontFamily: "inherit",
            }}
        >
            <span style={{ color: active && !accent ? "var(--color-accent)" : "inherit" }}>
                {icon}
            </span>
            {label}
        </button>
    ); 
}

// --------------------------
// MenuItem
// --------------------------

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="block w-full border-none cursor-pointer"
            style={{
                padding: "7px 12px",
                fontSize: 13,
                color: "var(--color-text)",
                textAlign: "left",
                fontFamily: "inherit",
                background: "transparent",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-surface-raised)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
            }}
        >
            {label}
        </button>
    );
}