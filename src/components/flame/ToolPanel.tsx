//
// Tool container in the flame workspace.
//
// * Note: Tools are just placeholders for now, until I implement each one separately.
//

import { X } from "lucide-react";
import { tools } from "../../lib/constants";
import { getToolIcon } from "../../lib/toolConfig";
import type { ToolInstance } from "../../types";

// --------------------------
// Props
// --------------------------

interface ToolPanelProps {
    flameId: string;
    instance: ToolInstance;
    onClose: () => void;
}

// --------------------------
// ToolPanel
// --------------------------

export function ToolPanel({ flameId, instance, onClose }: ToolPanelProps) {
    const toolDef   = tools.find((t) => t.name === instance.type);
    const label     = instance.label ?? toolDef?.label ?? instance.type;
    const icon      = toolDef ? getToolIcon(toolDef.icon) : null;

    return (
        <div
            className="flex flex-col h-full"
            style={{
                background: "var(--color-bg)",
            }}
        >
            {/* Tool header */}
            <div
                className="flex items-center justify-between px-4 shrink-0"
                style={{
                    height: 36,
                    borderBottom: "0.5px solid var(--color-border-subtle)",
                }}
            >
                <div
                    className="flex items-center gap-2"
                    style={{ fontSize: 12, color: "var(--color-text-muted)" }}
                >
                    <span style={{ color: "var(--color-accent)" }}>
                        {icon}
                    </span>
                    {label}
                </div>

                <button
                    onClick={onClose}
                    aria-label={`Close ${label}`}
                    className="flex items-center justify-center cursor-pointer border-none"
                    style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
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
                    {<X size={12} />}
                </button>
            </div>
            
            {/* Tool content */}
            <div className="flex-1 overflow-auto">
                <ToolContent flameId={flameId} instance={instance} />
            </div>
        </div>
    );
}

// --------------------------
// ToolContent
//
// Should render the correct tool component
//
// ! Note: Placeholders for now.
// --------------------------

function ToolContent({ flameId, instance }: { flameId: string; instance: ToolInstance }) {
    switch (instance.type) {
        case "markdown":
            // TODO: Replace with <MarkdownTool flameId={flameId} /> when done
            return (
                <div
                    className="flex items-center justify-center h-full text-white"
                    style={{ color: "var(--color-border)", fontSize: 13 }}
                >
                    Markdown editor coming soon
                </div>
            );
        
        case "kanban":
            // TODO: Replace with <KanbanTool flameId={flameId} /> when done
            return (
                <div
                    className="flex items-center justify-center h-full text-white"
                    style={{ color: "var(--color-border)", fontSize: 13 }}
                >
                    Kanban board coming soon
                </div>
            );
        
        default:
            return null;
    }
}