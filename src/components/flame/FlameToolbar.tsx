//
// Toolbar for... tools, duh.
//
// Implemented on FlameView
//

import React, { useState } from "react";
import { tools } from "../../lib/constants";
import { getToolIcon } from "../../lib/toolConfig";

// --------------------------
// Props
// --------------------------

interface FlameToolbarProps {
    tools: string[];
    activeTool: string | null;
    splitTool: string | null;

    onToolClick: (tool: string) => void;
    onToolDrop: (tool: string, side: "left" | "right") => void;
}

// --------------------------
// FlameToolbar
// --------------------------

export function FlameToolbar({
    tools,
    activeTool,
    splitTool,
    onToolClick,
    onToolDrop
}: FlameToolbarProps) {
    if (tools.length === 0) return null;

    return (
        <div className="flex items-center gap-1">
            {tools.map((tool) => (
                <ToolTab
                    key={tool}
                    tool={tool}
                    isActive={tool === activeTool || tool === splitTool}
                    onClick={() => onToolClick(tool)}
                    onDrop={onToolDrop}
                />
            ))}
        </div>
    );
}

// --------------------------
// ToolTab
// --------------------------

function ToolTab({
    tool,
    isActive,
    onClick,
    onDrop
}: {
    tool: string;
    isActive: boolean;
    onClick: () => void;
    onDrop: (tool: string, side: "left" | "right") => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    
    const toolDef = tools.find((t) => t.name === tool);
    const label = toolDef?.label ?? tool;
    const icon = toolDef ? getToolIcon(toolDef.icon) : null;

    const handleDragStart = (e: React.DragEvent) => {
        // Save the name of the tool so FlameWorkspace knows which tool is being dragged
        e.dataTransfer.setData("tool", tool);
        e.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    return (
        <button
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={onClick}
            aria-label={label}
            className="flex items-center gap-1.5 cursor-pointer transition-colors text-xs"
            style={{
                background: isActive ? "var(--color-surface-raised)" : "transparent",
                border: isActive ? "0.5px solid var(--color-border)" : "0.5px solid transparent",
                color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
                borderRadius: 6,
                padding: "4px 8px",
                fontFamily: "inherit",
                opacity: isDragging ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background    = "var(--color-surface-raised)";
                    e.currentTarget.style.color         = "var(--color-text)";
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background    = "transparent";
                    e.currentTarget.style.color         = "var(--color-text-muted)";
                }
            }}
        >
            <span style={{ color: isActive ? "var(--color-accent)" : "inherit"}}>
                {icon}
            </span>
            {label}
        </button>
    );
}