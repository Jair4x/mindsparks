//
// Toolbar for... tools, duh.
//
// Implemented on FlameView
//

import React, { useState } from "react";
import { tools } from "../../lib/constants";
import { getToolIcon } from "../../lib/tools/toolConfig";
import type { ToolInstance } from "../../types";

// --------------------------
// Props
// --------------------------

interface FlameToolbarProps {
    toolInstances: ToolInstance[];
    activeTool: string | null;  // instanceid
    splitTool: string | null;   // instanceid

    onToolClick: (instanceId: string) => void;
}

// --------------------------
// FlameToolbar
// --------------------------

export function FlameToolbar({
    toolInstances,
    activeTool,
    splitTool,
    onToolClick
}: FlameToolbarProps) {
    if (toolInstances.length === 0) return null;

    return (
        <div className="flex items-center gap-1">
            {toolInstances.map((instance) => (
                <ToolTab
                    key={instance.id}
                    instance={instance}
                    isActive={instance.id === activeTool || instance.id === splitTool}
                    onClick={() => onToolClick(instance.id)}
                />
            ))}
        </div>
    );
}

// --------------------------
// ToolTab
// --------------------------

function ToolTab({
    instance,
    isActive,
    onClick
}: {
    instance: ToolInstance;
    isActive: boolean;
    onClick: () => void;
}) {
    const [isDragging, setIsDragging] = useState(false);
    
    const toolDef = tools.find((t) => t.name === instance.type);
    const label = instance.label ?? toolDef?.label ?? instance.type;
    const icon = toolDef ? getToolIcon(toolDef.icon) : null;

    const handleDragStart = (e: React.DragEvent) => {
        // Save the ID of the tool so FlameWorkspace knows which tool is being dragged
        e.dataTransfer.setData("tool", instance.id);
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