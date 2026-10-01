//
// The floating side panel in the canvas.
//  This component is the main control panel to interact with the canvas besides being inside a spark or flame.
//
// * Note: Search, filters, list view and settings DON'T have logic yet.
//

import {
    Plus,
    Search,
    LayoutGrid,
    Tags,
    Network,
    Filter,
    List,
    Settings,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// --------------------------
// Types
// --------------------------

// Group modes available in the canvas.
// "none" is the default, no forced grouping.
type GroupMode = "none" | "category" | "hierarchy";

// --------------------------
// SidePanel
// --------------------------

export function SidePanel({ onCreateSpark }: { onCreateSpark: () => void }) {
    const [groupMode, setGroupMode] = useState<GroupMode>("none");
    const { t }                     = useTranslation("nodes");

    return (
        <aside
            className="absolute left-3 z-10 flex flex-col items-center"
            style={{
                top: "50%",
                transform: "translateY(-50%)",
                background: "var(--color-surface)",
                border: "0.5px solid var(--color-accent)",
                borderRadius: 999,
                padding: "10px 0",
                width: 59,
            }}
        >
            {/*
                Create spark button
            */}
            <PanelCreateButton onClick={onCreateSpark} />

            <PanelDivider />

            {/* 
                Search
                
                No logic for now, so disabled.
            */}
            <PanelButton icon={<Search size={17} />} label={t("sidePanel.search")} disabled />

            {/*
                Grouping buttons

                One can be active at a time.
                Active changes the current local groupMode.
                No real logic for now, so they're disabled.
            */}
            <PanelButton
                icon={<LayoutGrid size={17} />}
                label={t("sidePanel.noGrouping")}
                //isActive={groupMode === "none"}
                onClick={() => setGroupMode("none")}
                disabled
            />
            <PanelButton
                icon={<Tags size={17} />}
                label={t("sidePanel.groupByCategory")}
                isActive={groupMode === "category"}
                onClick={() => setGroupMode("category")}
                disabled
            />
            <PanelButton
                icon={<Network size={17} />}
                label={t("sidePanel.groupByHierarchy")}
                isActive={groupMode === "hierarchy"}
                onClick={() => setGroupMode("hierarchy")}
                disabled
            />

            <PanelDivider />

            {/*
                Filters, list view and config.

                No logic for now, so they're disabled.
            */}
            <PanelButton icon={<Filter size={17} />}    label={t("sidePanel.filter")}      disabled />
            <PanelButton icon={<List size={17} />}      label={t("sidePanel.listView")}   disabled />
            <PanelButton icon={<Settings size={17} />}  label={t("sidePanel.config")}      disabled />
        </aside>
    );
}


// --------------------------
// PanelCreateButton
//
// The button to create a spark. Visually different from the others:
//  Has its own background and border so it's distinguished as the main action.
// --------------------------
function PanelCreateButton({ onClick }: { onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const { t }                     = useTranslation("common");

    return (
        <button
            aria-label={t("create")}
            onClick={onClick}
            className="flex items-center justify-center cursor-pointer shrink-0"
            style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "none",
                background: isHovered ? "var(--color-accent)" : "var(--color-surface-raised)",
                color: isHovered ? "var(--color-surface)" : "var(--color-accent)",
                marginBottom: 6,
                marginTop: 4,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Plus size={17} />
        </button>
    );
}

// --------------------------
// PanelButton
//
// Generic button for the side panel. No visible border by default.
//  Light background on hover, and active color when needed.
// --------------------------
function PanelButton({
    icon,
    label,
    isActive = false,
    onClick,
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    disabled?: boolean;
}) {
    const [hovered, setHovered] = useState(false);

    const showHoverStyle = hovered && !isActive && !disabled;

    return (
        <button
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className="flex items-center justify-center cursor-pointer transition-colors shrink-0"
            style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                border: "none",
                background: isActive || showHoverStyle ? "var(--color-surface-raised)" : "transparent",
                color: disabled
                    ? "var(--color-text-muted)"
                    : isActive
                        ? "var(--color-accent)"
                        : showHoverStyle
                            ? "var(--color-text)"
                            : "var(--color-accent-light)",
                cursor: disabled ? "not-allowed" : "pointer",
                margin: "2px 0",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {icon}
        </button>
    );
}

// --------------------------
// PanelDivider
//
// Divider between groups of buttons in the side panel.
// --------------------------
function PanelDivider() {
    return (
        <div
            style={{
                width: 24,
                height: "0.5px",
                background: "var(--color-surface-raised)",
                margin: "4px 0",
                flexShrink: 0,
            }}
        />
    );
}
