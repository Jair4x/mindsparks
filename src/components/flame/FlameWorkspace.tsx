//
// Workspace for the Flame
//  Shows one or two active tools
//
// * Note: This is sort of a preliminary version. Things are absolutely gonna change in the future,
// *       be it by adding a more diverse split view, adding tabs for people who want to
// *       work on tabs like a browser instead of split view and one tool at a time, etc.
//

import { useState, useCallback, useRef } from "react";
import { Panel, Group, Separator, useGroupRef } from "react-resizable-panels";
import { ToolPanel } from "./ToolPanel";

// --------------------------
// Props
// --------------------------

interface FlameWorkspaceProps {
    flameId: string;
    activeTool: string | null;
    splitTool: string | null;
    onToolDrop: (tool: string, side: "left" | "right") => void;
    onCloseTool: (tool: string) => void;
}

// --------------------------
// FlameWorkspace
// --------------------------

export function FlameWorkspace({
    flameId,
    activeTool,
    splitTool,
    onToolDrop,
    onCloseTool,
}: FlameWorkspaceProps) {
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(true);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDraggingOver(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, side: "left" | "right") => {
        e.preventDefault();
        setIsDraggingOver(false);
        const tool = e.dataTransfer.getData("tool");
        if (tool) onToolDrop(tool, side);
    }, [onToolDrop]);

    // No active tool, placeholder message
    if (!activeTool) {
        return (
            <div
                className="flex flex-1 items-center justify-center"
                style={{ color: "var(--color-border)" }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "left")}
            >
                <span style={{ fontSize: 13 }}>
                    Select a tool from the toolbar to get started
                </span>
            </div>
        );
    }

    return (
        <div
            className="h-full relative overflow-hidden"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnter={handleDragEnter}
        >
            {/* Drop zones, only visibles when dragging */}
            {isDraggingOver && (
                <>
                    {/* Left */}
                    <DropZone
                        side="left"
                        onDrop={(e) => handleDrop(e, "left")}
                    />

                    {/* Right */}
                    <DropZone
                        side="right"
                        onDrop={(e) => handleDrop(e, "right")}
                    />
                </>
            )}

            {/* Normal view or split view */}
            {splitTool
                ? (
                    <Group
                        orientation="horizontal"
                        className="h-full"
                    >
                        <Panel defaultSize={"50%"} minSize={"25%"}>
                            <ToolPanel
                                flameId={flameId}
                                tool={activeTool}
                                onClose={() => onCloseTool(activeTool)}
                            />
                        </Panel>

                        <Separator
                            style={{
                                width: 4,
                                background: "var(--color-border-subtle)",
                                cursor: "col-resize",
                                transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "var(--color-accent)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "var(--color-border-subtle)";
                            }}
                        />

                        <Panel minSize={"25%"}>
                            <ToolPanel
                                flameId={flameId}
                                tool={splitTool}
                                onClose={() => onCloseTool(splitTool)}
                            />
                        </Panel>
                    </Group>
                )
                : (
                    <ToolPanel
                        flameId={flameId}
                        tool={activeTool}
                        onClose={() => onCloseTool(activeTool)}
                    />
                )}
        </div>
    );
}

// --------------------------
// DropZone
//
// Screen zone for split view. Occupies either the left or right half
//  of the workspace and makes itself visible when actively dragging.
// --------------------------

function DropZone({
    side,
    onDrop,
}: {
    side: "left" | "right";
    onDrop: (e: React.DragEvent) => void;
}) {
    const [isOver, setIsOver] = useState(false);

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(e) => { setIsOver(false); onDrop(e); }}
            className="absolute flex items-center justify-center top-0 bottom-0 z-10 w-[50%]"
            style={{
                [side]: 0,
                background: isOver
                    ? "var(--color-accent-muted)"
                    : "rgba(127, 82, 233, 0.05)", // #7f52e9, you can't set 0.05 opacity if not.
                border: `1px dashed ${isOver ? "var(--color-accent)" : "var(--color-border-accent)"}`,
                transition: "background 0.15s, border-color 0.15s",
                pointerEvents: "all",
            }}
        >
            <span style={{
                fontSize: 12,
                color: isOver ? "var(--color-accent)" : "var(--color-text-muted)",
                transition: "color 0.15s",
            }}>
                {side === "left" ? "← Drop here" : "Drop here →" /* Arrows are just ascii */} 
            </span>
        </div>
    );
}