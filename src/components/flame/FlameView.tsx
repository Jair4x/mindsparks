//
// When you convert a spark into a flame, the canvas gets replaced by this: the FlameView.
//
// Navigation between canvas and flame is managed with the Navigation Stack from UIStore.
//  Pressing "Go back" goes to the previous screen, be it a flame or the canvas if the stack is empty.
//
//

import { useState, useCallback } from "react";
import { ArrowLeft, Info, Settings, MoreHorizontal, LayoutGrid } from "lucide-react";
import { useUIStore, useFlameStore, useSparkStore } from "../../store";
import type { string } from "../../types";

// TODO: These two, gonna import and use them, but they don't exist yet.
import { FlameToolbar } from "./FlameToolbar";
import { FlameWorkspace } from "./FlameWorkspace";

// --------------------------
// FlameView
//
// The view that'll replace the canvas
// --------------------------

export function FlameView() {
    const activeFlameId         = useUIStore((state) => state.activeFlameId);
    const navigationStack       = useUIStore((state) => state.navigationStack);
    const goBack                = useUIStore((state) => state.goBack);
    const openModal             = useUIStore((state) => state.openModal);
    
    const flame = useFlameStore((state) =>
        state.flames.find((f) => f.id === activeFlameId)
    );
    
    if (!flame) return null;

    const spark = useSparkStore((state) =>
        state.sparks.find((s) => s.id === flame.sparkId)
    );

    const updateFlameName = useFlameStore((state) => state.updateFlameName);
    const updateSparkName = useSparkStore((state) => state.updateSparkText);

    const [isEditing, setIsEditing]     = useState(false);
    const [editName, setEditName]       = useState("");
    const [activeTool, setActiveTool]   = useState<string | null>(
        flame?.tools[0] ?? null
    );

    const displayName = isEditing ? editName : (flame?.name ?? "");

    const [splitTool, setSplitTool] = useState<string | null>(null); // For split view


    const handleNameFocus = () => {
        setEditName(flame?.name ?? "");
        setIsEditing(true);
    };

    const handleNameBlur = () => {
        setIsEditing(false);
        const trimmed = editName.trim();
        if (trimmed && trimmed !== flame.name) {
            updateFlameName(flame!.id, trimmed);
            updateSparkName(spark!.id, trimmed);
        }
    };

    const backLabel = navigationStack.length > 0 ? "Previous Flame" : "Canvas";

    // Handles dropping a tool into the workspace.
    // If there's NOT an active tool in the workspace, it activates it.
    // If there IS an active tool, it activates split view.
    const handleToolDrop = useCallback((tool: string, side: "left" | "right") => {
        if (!activeTool) {
            setActiveTool(tool);
            return;
        }

        if (side === "left") {
            setSplitTool(activeTool);
            
            setActiveTool(tool);
        } else {
            setSplitTool(tool);
        }
    }, [activeTool]);

    // Close a tool in the split view.
    // The other one occupies the whole space.
    const handleCloseTool = useCallback((tool: string) => {
        if (tool === activeTool) {
            setActiveTool(splitTool);
            setSplitTool(null);
        } else {
            setSplitTool(null);
        }
    }, [activeTool, splitTool]);


    return (
        <div
            className="flex flex-col w-full h-full"
            style={{ background: "var(--color-bg)" }}
        >
            {/*----------------------------------------
                Header
            -------------------------------------------*/}
            <header
                className="flex items-center px-3 shrink-0 z-20"
                style={{
                    height: 44,
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                }}
            >
                {/* Left: "Go back" button */}
                <button
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-sm cursor-pointer shrink-0 border-none"
                    style={{
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        fontFamily: "inherit",
                        padding: "4px 8px",
                        borderRadius: 6,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background    = "var(--color-surface-raised)";
                        e.currentTarget.style.color         = "var(--color-text)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background    = "transparent";
                        e.currentTarget.style.color         = "var(--color-text-muted)";
                    }}
                >
                    <ArrowLeft size={14} />
                    {backLabel}
                </button>

                {/* Center: Name + toolbar */}
                <div className="flex flex-1 items-center justify-center gap-3">
                    <input
                        value={displayName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleNameBlur}
                        onFocus={handleNameFocus}
                        className="bg-transparent border-none outline-none text-right font-semibold"
                        style={{
                            fontSize: 15,
                            color: "var(--color-text)",
                            fontFamily: "inherit",
                            maxWidth: 240,
                        }}
                    />
                    
                    <Separator />
                    
                    <FlameToolbar
                        tools={flame.tools}
                        activeTool={activeTool}
                        splitTool={splitTool}
                        onToolClick={(tool) => {
                            if (tool === activeTool || tool === splitTool) {
                                handleCloseTool(tool);
                            } else {
                                setActiveTool(tool);
                            }
                        }}
                        onToolDrop={handleToolDrop}
                    />

                    <Separator />
                    
                    <HeaderButton
                        icon={<LayoutGrid size={14} />}
                        label="Manage Tools"
                        onClick={() => openModal("manage-tools", flame.id)} // TODO: Open the tools modal when made.
                    />
                </div>

                {/* Right: Flame management */}
                <div className="flex items-center gap-1 shrink-0">
                    <HeaderButton
                        icon={<Info size={14} />}
                        label="Spark info"
                        onClick={() => openModal("spark-detail", spark.id)}
                    />
                    <HeaderButton
                        icon={<Settings size={14} />}
                        label="App Settings"
                        onClick={() => {}} // TODO: Implement this
                    />
                    <HeaderButton
                        icon={<MoreHorizontal size={14} />}
                        label="More options"
                        onClick={() => {}} // TODO: Implement this
                    />
                </div>
            </header>

            {/*----------------------------------------
                Workspace
            -------------------------------------------*/}
            <section className="flex-1 min-h-0">
                <FlameWorkspace
                    flameId={flame.id}
                    activeTool={activeTool}
                    splitTool={splitTool}
                    onToolDrop={handleToolDrop}
                    onCloseTool={handleCloseTool}
                />
            </section>
        </div>
    );
}

// --------------------------
// HeaderButton
//
// Generic button for the flame's bar.
// --------------------------
function HeaderButton({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-label={label}
            onClick={onClick}
            className="flex items-center justify-center cursor-pointer border-none"
            style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: "transparent",
                color: "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background    = "var(--color-surface-raised)";
                e.currentTarget.style.color         = "var(--color-text)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background    = "transparent";
                e.currentTarget.style.color         = "var(--color-text-muted)";
            }}
        >
            {icon}
        </button>
    );
}

function Separator() {
    return (
        <div
            style={{
                width: "0.5px",
                height: 16,
                background: "var(--color-border)",
                flexShrink: 0,
            }}
        />
    );
}