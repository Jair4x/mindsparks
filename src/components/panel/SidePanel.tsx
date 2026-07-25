//
// The floating side panel in the canvas.
//  This component is the main control panel to interact with the canvas besides being inside a spark or flame.
//
// Note: This doesn't have a working logic yet.
//       Buttons just update the UI store or trigger actions that'll be implemented later.
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

// --------------------------
// Types
// --------------------------

// Group modes available in the canvas.
// "none" is the default, no forced grouping.
type GroupMode = "none" | "category" | "hierarchy";

// --------------------------
// Local state
//
// Note/To future me: The active group mode lives in this panel.
//                    When you (me) need other components to read it (like from the canvas to know how to position the cards),
//                    move onCreateSpark to UI Store.
// --------------------------
import { useState } from "react";

export function SidePanel({ onCreateSpark }: { onCreateSpark: () => void }) {
    const [groupMode, setGroupMode] = useState<GroupMode>("none");

    return (
        <aside
            className="absolute left-3 z-10 flex flex-col items-center"
            style={{
                top: "50%",
                transform: "translateY(-50%)",
                background: "#1A1625",
                border: "0.5px solid #7F52E9",
                borderRadius: 999,
                padding: "10px 0",
                width: 44,
            }}
        >
            {/*
                Create spark button
            */}
            <PanelCreateButton onClick={onCreateSpark} />

            <PanelDivider />

            {/* 
                Search
                
                No logic for now.
            */}
            <PanelButton icon={<Search size={15} />} label="Buscar Spark" />

            {/*
                Grouping buttons

                One can be active at a time.
                Active changes the current local groupMode.
            */}
            <PanelButton
                icon={<LayoutGrid size={15} />}
                label="Sin agrupar"
                isActive={groupMode === "none"}
                onClick={() => setGroupMode("none")}
            />
            <PanelButton
                icon={<Tags size={15} />}
                label="Agrupar por categoría"
                isActive={groupMode === "category"}
                onClick={() => setGroupMode("category")}
            />
            <PanelButton
                icon={<Network size={15} />}
                label="Agrupar por jerarquía"
                isActive={groupMode === "hierarchy"}
                onClick={() => setGroupMode("hierarchy")}
            />

            <PanelDivider />

            {/*
                Filters, list view and config.

                No logic for now.
            */}
            <PanelButton icon={<Filter size={15} />} label="Filtrar" />
            <PanelButton icon={<List size={15} />} label="Vista de lista" />
            <PanelButton icon={<Settings size={15} />} label="Configuración" />
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
    return (
        <button
            aria-label="Crear Spark"
            onClick={onclick}
            className="flex items-center justify-center cursor-pointer shrink-0"
            style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                background: "#2A2438",
                color: "#7F52E9",
                marginBottom: 6,
                marginTop: 4,
            }}
        >
            <Plus size={14} />
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
}: {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
}) {
    return (
        <button
            aria-label={label}
            onClick={onClick}
            className="flex items-center justify-center cursor-pointer transition-colors shrink-0"
            style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "none",
                background: isActive ? "#2A2438" : "transparent",
                color: isActive ? "#7F52E9" : "#BEB1E6",
                margin: "2px 0",
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "#2A2438";
                    (e.currentTarget as HTMLButtonElement).style.color      = "#C9C4D8";
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color      = "#BEB1E6";
                }
            }}
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
                background: "#2A2438",
                margin: "4px 0",
                flexShrink: 0,
            }}
        />
    );
}
