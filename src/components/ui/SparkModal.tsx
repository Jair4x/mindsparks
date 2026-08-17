//
// Modal of the details of a spark.
//  Opens when the user clicks on a spark card in the canvas.
//

import { useEffect, useRef, useState } from "react";
import { Tag, FlameIcon, X, ChevronRight, ArchiveRestore } from "lucide-react";
import { useSparkStore, useUIStore, useCategoryStore } from "../../store";
import { useNow, formatRelativeDate } from "../../lib/utils";
import { useChildren, useParent, useRelated } from "../../lib/nodeRelations";
import { Spark, Flame } from "../../types";

import {
    SPARK_DESC_MAX_LENGTH as DESC_MAX_LENGTH
} from "../../lib/constants";

// --------------------------
// Helper functions
// --------------------------

function nodeLabel(node: Spark | Flame): string {
    const name = "text" in node ? node.text : node.name;
    return node.isArchived ? `${name} (archived)` : name;
}

// --------------------------
// SparkModal
// --------------------------

export function SparkModal() {
    const activeModal       = useUIStore((s) => s.activeModal);
    const activeModalNodeId = useUIStore((s) => s.activeModalNodeId);
    const closeModal        = useUIStore((s) => s.closeModal);
    
    const spark = useSparkStore((s) =>
        s.sparks.find((sp) => sp.id === activeModalNodeId)
    );

    if (activeModal !== "spark-detail" || !spark) return null;

    return (
        <SparkModalContent
            sparkId={spark.id}
            onClose={closeModal}
        />
    );
}

// --------------------------
// SparkModalContent
// --------------------------
function SparkModalContent({ sparkId, onClose }: { sparkId: string; onClose: () => void }) {
    const spark             = useSparkStore((s) => s.sparks.find((s) => s.id === sparkId))!;
    const updateText        = useSparkStore((s) => s.updateSparkText);
    const updateDescription = useSparkStore((s) => s.updateSparkDescription);
    const openModal         = useUIStore((s) => s.openModal);
    const restoreSpark      = useSparkStore((s) => s.restoreSpark);

    const category = useCategoryStore((s) =>
        spark.categoryId ? s.categories.find((c) => c.id === spark.categoryId) : undefined
    );

    const children      = useChildren(sparkId);
    const parent        = useParent(spark.parentId);
    const related       = useRelated(sparkId);
    const nowMs         = useNow();
    const overlayRef    = useRef<HTMLDivElement>(null);
    
    const [name, setName]                                   = useState(spark.text);
    const [description, setDescription]                     = useState(spark.description ?? "");
    const [showFamily, setShowFamily]                       = useState(false);
    const [isCategoryBtnHovered, setIsCategoryBtnHovered]   = useState(false);
    
    const hasFamily = !!parent || children.length > 0 || related.length > 0;

    // Close with Esc key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
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

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.5)" }}
        >
            <div
                className="flex flex-col"
                style={{
                    background:     "var(--color-surface)",
                    border:         `0.5px solid ${category ? category.color : "var(--color-border)"}`,
                    borderRadius:   16,
                    width:          480,
                    maxHeight:      "80vh",
                    boxShadow:      category ? `0 0 24px ${category.color}22` : "0 8px 32px rgba(0,0,0,0.4)",
                }}
            >
                {/*------------------------------------------
                                    Header
                ---------------------------------------------*/}
                <div
                    style={{
                        padding:        "16px 16px 12px",
                        borderBottom:   "0.5px solid var(--color-border)",
                    }}
                >
                    {/*
                        Top row: category selection + close button
                    */}
                    <div className="flex items-center justify-between mb-2">
                        {/* Left: Category button + pill if active */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openModal("category-form", spark.id) } // TODO: Change this to an actual selection, not open the category creation modal. (Or edit the category modal, who knows.)
                                aria-label="Change category"
                                className="flex items-center justify-center cursor-pointer"
                                style={{
                                    width:          24,
                                    height:         24,
                                    borderRadius:   6,
                                    border:         "0.5px solid var(--color-border)",
                                    background:     "var(--color-surface-raised)",
                                    color:          isCategoryBtnHovered ? "var(--color-accent)" : "var(--color-text-muted)",
                                }}
                                onMouseEnter={() => setIsCategoryBtnHovered(true)}
                                onMouseLeave={() => setIsCategoryBtnHovered(false)}
                            >
                                <Tag size={12} />
                            </button>

                            {category && (
                                <div className="flex items-center gap-1.5">
                                    <span
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            background: category.color,
                                            flexShrink: 0,
                                        }}
                                    />

                                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                                        {category.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Right: Close button */}
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
                        Name
                    */}
                    <div className="flex items-start gap-2">
                        <input
                            value={name}
                            placeholder="Your idea..."
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleNameBlur}
                            className="flex flex-1 bg-transparent border-none outline-none"
                            style={{
                                fontSize:   18,
                                fontWeight: 600,
                                color:      "var(--color-text)",
                                fontFamily: "inherit",
                            }}
                        />
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
                                fontSize:   13,
                                color:      "var(--color-text-muted)",
                                fontFamily: "inherit",
                                resize:     "none",
                            }}
                        />
                        {description.length > 0 && (
                            <div style={{ fontSize: 10, color: "var(--color-text-muted)", flexShrink: 0, marginTop: 2 }}>
                                {description.length}/{DESC_MAX_LENGTH}
                            </div>
                        )}
                    </div>

                    {/*
                        Right column: Family + timestamp
                    */}
                    <div className="flex justify-end mt-2.5 select-none">
                        <div className="flex flex-col items-end gap-1">
                            {/*
                                Creation Date
                            */}
                            <div style={{ fontSize: 12, color: "var(--color-text-muted)"}}>
                                Created {formatRelativeDate(spark.createdAt, nowMs)}
                            </div>

                            {/*
                                Family
                            */}
                            <button
                                onClick={() => setShowFamily((v) => !v)}
                                className="flex items-center gap-1 bg-transparent border-none cursor-pointer text-xs p-0"
                                style={{
                                    fontFamily: "inherit",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                Family
                                <ChevronRight
                                    size={12}
                                    style={{
                                        transform: showFamily ? "rotate(90deg)" : "rotate(0deg)",
                                        transition: "transform 0.15s ease",
                                    }}
                                />
                            </button>
                                
                            {/*
                                Family panel
                            */}
                            {showFamily && (
                                <div
                                    style={{
                                        marginTop:  4,
                                        textAlign:  "left",
                                        minWidth:   160,
                                    }}
                                >
                                    {parent && (
                                        <>
                                            <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "center", marginBottom: 2 }}>
                                                Parent
                                            </div>
                                            <div style={{ fontSize: 13, color: "var(--color-text)", marginBottom: 8, textAlign: "right" }}>
                                                {nodeLabel(parent)}
                                            </div>
                                        </>
                                    )}

                                    {children.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "center", marginBottom: 2 }}>
                                                Children
                                            </div>
                                            {children.map((child) => (
                                                <div key={child.id} style={{ fontSize: 13, color: "var(--color-text)", textAlign: "right" }}>
                                                    {nodeLabel(child)}
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {related.length > 0 && (
                                        <>
                                            <div
                                                style={{
                                                    fontSize:       11,
                                                    color:          "var(--color-text-muted)",
                                                    marginBottom:   2,
                                                    marginTop:      (parent || children.length > 0) ? 8 : 0,
                                                    textAlign:      "center",
                                                }}
                                            >
                                                Related
                                            </div>
                                            {related.map(({ connectionId, node}) => (
                                                <div key={connectionId} style={{ fontSize: 13, color: "var(--color-text)", textAlign: "right" }}>
                                                    {nodeLabel(node)}
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {!hasFamily && (
                                        <div style={{ fontSize: 12, color: "var(--color-text)", textAlign: "right" }}>
                                            No family yet
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/*
                        Action buttons
                    */}
                    <div className="flex gap-1.5 mt-3">
                        {spark.isArchived ? (
                            <ActionButton
                                icon={<ArchiveRestore size={13} />}
                                label="Restore"
                                onClick={() => { restoreSpark(sparkId); onClose(); }}
                                accent
                            />
                        ): (
                            <ActionButton
                                icon={<FlameIcon size={13} />}
                                label="Convert into flame"
                                onClick={() => openModal("spark-to-flame", spark.id)}
                                accent
                            />
                        )}
                    </div>
                </div>

                {/*------------------------------------------
                                Body: notes
                ---------------------------------------------*/}
                <div className="p-4 flex flex-col overflow-auto">
                    <div className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
                        Notes
                    </div>
                    {/* Disabled this since it's not implemented yet. */}
                    <textarea
                        placeholder="Coming soon..."
                        disabled
                        className="w-full min-h-30 max-h-60 leading-5 outline-none resize-none overflow-y-auto"
                        style={{
                            background:     "var(--color-surface-raised)",
                            border:         "0.5px solid var(--color-border)",
                            borderRadius:   8,
                            padding:        "10px 12px",
                            fontSize:       13,
                            fontFamily:     "inherit",
                            color:          "var(--color-text)",
                            cursor:         "not-allowed",
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
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    accent?: boolean;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            aria-label={label}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center gap-1.5 border-none text-xs cursor-pointer"
            style={{
                background: accent
                    ? hovered ? "var(--color-accent-dark)" : "var(--color-accent)"
                    : hovered ? "var(--color-border)" : "var(--color-surface-raised)",
                borderRadius: 6,
                padding: "6px 10px",
                color: accent
                    ? "#fff"
                    : hovered ? "var(--color-text)" : "var(--color-text-muted)",
                fontFamily: "inherit",
            }}
        >
            <span style={{ color: hovered && !accent ? "var(--color-accent)" : "inherit" }}>
                {icon}
            </span>
            {label}
        </button>
    );
}
