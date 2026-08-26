//
// Modal of the details of a node.
//  Opens when the user clicks on a spark card in the canvas, or from.
//

import { useEffect, useRef, useState } from "react";
import { Tag, FlameIcon, X, ChevronRight, ArchiveRestore, CheckCircle2 as CheckCircle, RotateCcw, Circle } from "lucide-react";
import { useSparkStore, useFlameStore, useUIStore, useCategoryStore } from "../../store";
import { useNow, formatRelativeDate } from "../../lib/utils";
import { useChildren, useParent, useRelated } from "../../lib/nodeRelations";
import { Spark, Flame } from "../../types";
import { SPARK_DESC_MAX_LENGTH as DESC_MAX_LENGTH } from "../../lib/constants";

// --------------------------
// NodeTarget
//  Resolved up front so the rest of the component works with the actual
//  Spark or Flame object, not an id it has to keep re-looking-up.
// --------------------------

type NodeTarget =
    | { type: "spark"; node: Spark }
    | { type: "flame"; node: Flame };

// --------------------------
// Helper functions
// --------------------------

function nodeLabel(node: Spark | Flame): string {
    const name = "text" in node ? node.text : node.name;
    return node.isArchived ? `${name} (archived)` : name;
}

// --------------------------
// NodeInfoModal
//  Previously SparkModal, now generalized to include both types of nodes data.
// --------------------------

export function NodeInfoModal() {
    const activeModal       = useUIStore((s) => s.activeModal);
    const activeModalNodeId = useUIStore((s) => s.activeModalNodeId);
    const closeModal        = useUIStore((s) => s.closeModal);
    
    const flame = useFlameStore((s) => s.flames.find((f) => f.id === activeModalNodeId));
    const spark = useSparkStore((s) => s.sparks.find((sp) => sp.id === activeModalNodeId));

    if (activeModal !== "node-detail") return null;

    const target: NodeTarget | null = flame
        ? { type: "flame", node: flame }
        : spark
            ? { type: "spark", node: spark }
            : null;
    
    if (!target) return null;

    return (
        <NodeInfoModalContent
            key={target.node.id}
            target={target}
            onClose={closeModal}
        />
    );
}

// --------------------------
// NodeInfoModalContent
// --------------------------

function NodeInfoModalContent({ target, onClose }: { target: NodeTarget; onClose: () => void }) {
    const isFlame = target.type === "flame";

    const updateSparkText        = useSparkStore((s) => s.updateSparkText);
    const updateSparkDescription = useSparkStore((s) => s.updateSparkDescription);
    const restoreSpark           = useSparkStore((s) => s.restoreSpark);
    
    const updateFlameName   = useFlameStore((s) => s.updateFlameName);
    const completeFlame     = useFlameStore((s) => s.completeFlame);
    const reopenFlame       = useFlameStore((s) => s.reopenFlame);
    const restoreFlame      = useFlameStore((s) => s.restoreFlame);
    
    const openModal         = useUIStore((s) => s.openModal);
    const openFlame         = useUIStore((s) => s.openFlame);

    const category = useCategoryStore((s) =>
        target.node.categoryId ? s.categories.find((c) => c.id === target.node.categoryId) : undefined
    );

    const children      = useChildren(target.node.id);
    const parent        = useParent(target.node.parentId);
    const related       = useRelated(target.node.id);
    const nowMs         = useNow();
    const overlayRef    = useRef<HTMLDivElement>(null);
    
    const initialName = isFlame ? target.node.name : target.node.text;

    const [name, setName]                                   = useState(initialName);
    const [description, setDescription]                     = useState(!isFlame ? (target.node.description ?? "") : "");
    const [showFamily, setShowFamily]                       = useState(false);
    const [isCategoryBtnHovered, setIsCategoryBtnHovered]   = useState(false);
    const [pendingFlameNav, setPendingFlameNav]             = useState<Flame | null>(null);

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
        if (!trimmed || trimmed === initialName) return;

        if (isFlame) updateFlameName(target.node.id, trimmed);
        else updateSparkText(target.node.id, trimmed);
    };

    // Save description when unfocused
    const handleDescriptionBlur = () => {
        if (isFlame) return; // Nothing to save this into for a Flame
        
        if (description !== (target.node.description ?? "")) {
            updateSparkDescription(target.node.id, description);
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const handleFamilyClick = (node: Spark | Flame) => {
        if ("text" in node) {
            openModal("node-detail", node.id);
        } else {
            setPendingFlameNav(node);
        }
    };

    const handleViewFlameInfo = () => {
        if (!pendingFlameNav) return;
        openModal("node-detail", pendingFlameNav.id);
        setPendingFlameNav(null);
    };

    const handleOpenFlameWorkspace = () => {
        if (!pendingFlameNav) return;
        openFlame(pendingFlameNav.id);
        setPendingFlameNav(null);
        onClose();
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
                                onClick={() => openModal("assign-category", target.node.id) }
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

                                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", userSelect: "none" }}>
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
                    {!isFlame && (
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
                    )}

                    {/*
                        Right column: Family + timestamp
                    */}
                    <div className="flex justify-end mt-2.5 select-none">
                        <div className="flex flex-col items-end gap-1">
                            {/*
                                Creation Date
                            */}
                            <div style={{ fontSize: 12, color: "var(--color-text-muted)"}}>
                                Created {formatRelativeDate(target.node.createdAt, nowMs)}
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
                                            <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "right", marginBottom: 2 }}>
                                                Parent
                                            </div>
                                            <FamilyEntry node={parent} onClick={() => handleFamilyClick(parent)} />
                                        </>
                                    )}

                                    {children.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "right", marginBottom: 2 }}>
                                                Children
                                            </div>
                                            {children.map((child) => (
                                                <FamilyEntry key={child.id} node={child} onClick={() => handleFamilyClick(child)} />
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
                                                    textAlign:      "right",
                                                }}
                                            >
                                                Related
                                            </div>
                                            {related.map(({ connectionId, node}) => (
                                                <FamilyEntry key={connectionId} node={node} onClick={() => handleFamilyClick(node) } />
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
                            Okay, so, this has a big, big, BIG, BIIIIIIIG multi-terniary, whatever
                    */}
                    <div className="flex gap-1.5 mt-3">
                        {isFlame ? (
                            target.node.isArchived ? (
                                <ActionButton
                                    icon={<ArchiveRestore size={13} />}
                                    label="Restore"
                                    onClick={() => { restoreFlame(target.node.id); onClose(); }}
                                    accent
                                />
                            ) : target.node.isCompleted ? (
                                    <ActionButton
                                        icon={<RotateCcw size={13} />}
                                        label="Reopen"
                                        onClick={() => reopenFlame(target.node.id)}
                                    />
                            ) : (
                                <ActionButton
                                    icon={<CheckCircle size={13} />}
                                    label="Mark as completed"
                                    onClick={() => completeFlame(target.node.id)}
                                    accent
                                />
                            )
                        ) : target.node.isConvertedToFlame ? (
                            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                                This node was converted into a Flame.
                            </div>
                        ) : target.node.isArchived ? (
                            <ActionButton
                                icon={<ArchiveRestore size={13} />}
                                label="Restore"
                                onClick={() => { restoreSpark(target.node.id); onClose(); }}
                                accent
                            />
                        ) : (
                            <ActionButton
                                icon={<FlameIcon size={13} />}
                                label="Convert into flame"
                                onClick={() => openModal("spark-to-flame", target.node.id)}
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

                {/*------------------------------------------
                            Confirmation dialog
                ---------------------------------------------*/}
                {pendingFlameNav && (
                    <div
                        className="fixed inset-0 flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.5)", zIndex: 60 }}
                        onClick={(e) => { if (e.target === e.currentTarget) setPendingFlameNav(null); }}
                    >
                        <div
                            style={{
                                background: "var(--color-surface)",
                                border: "0.5px solid var(--color-border)",
                                borderRadius: 14,
                                width: 320,
                                padding: 16,
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
                                {pendingFlameNav.name}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 14 }}>
                                What do you want to see?
                            </div>

                            <div className="flex flex-col gap-2">
                                <ActionButton
                                    icon={<Tag size={13} />}
                                    label={"Node info"}
                                    onClick={handleViewFlameInfo}
                                    accent
                                />
                                <ActionButton
                                    icon={<FlameIcon size={13} />}
                                    label="Open Workspace"
                                    onClick={handleOpenFlameWorkspace}
                                />
                            </div>
                        </div>
                    </div>
                )}
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

// --------------------------
// FamilyEntry
//  A single clickable parent/child/related row in the Family panel.
// --------------------------

function FamilyEntry({ node, onClick }: { node: Spark | Flame; onClick: () => void; }) {
    const [hovered, setHovered] = useState(false);
    const isFlame = !("text" in node);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center justify-end gap-1.5 w-full cursor-pointer bg-transparent border-none"
            style={{ padding: "1px 0", fontFamily: "inherit" }}
        >
            <span
                style={{
                    fontSize: 13,
                    color: hovered ? "var(--color-accent)" : "var(--color-text)",
                    textAlign: "right",
                    transition: "color 0.15s",
                }}
            >
                {nodeLabel(node)}
            </span>
            {isFlame
                ? <FlameIcon size={10} fill="var(--color-flame)" color="var(--color-flame)" />
                : <Circle size={6} fill="var(--color-text-muted)" color="var(--color-text-muted)" />
            }
        </button>
    );
}