//
// Base layout for the App.
//
// Defines the whole visual structure: side panel to the left and main canvas using the rest of the space.
//  It's only use is to distribute the space on screen and react to the state of the UI (if side panel is collapsed or zen mode is active)
//

import { Layers, ChevronDown, Maximize2, Minus, Plus } from "lucide-react";
import { SidePanel } from "../panel/SidePanel";
import { useUIStore } from "../../store/ui";
import { useSpaceStore } from "../../store/spaces";

// --------------------------
// Components
// --------------------------

export function AppLayout() {
    const isPanelCollapsed  = useUIStore((state) => state.isPanelCollapsed);
    const isZenModeActive = useUIStore((state) => state.isZenModeActive);
    
    useSpaceStore((state) => state.initializeDefaultSpace());
    const activeSpace       = useSpaceStore((state) => state.getActiveSpace());
    
    const showPanel         = !isPanelCollapsed && !isZenModeActive;

    return (
        <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#100B1F" }}>
            {/*
                Dot background. 
                An SVG pattern position throughout the whole canvas.
                Dots have low opacity so they can be seen without disturbing the background.
            */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern
                        id="dot-grid"
                        x="0"
                        y="0"
                        width="24"
                        height="24"
                        patternUnits="userSpaceOnUse"
                    >
                        <circle cx="1" cy="1" r="1" fill="#7F52E9" opacity="0.12" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dot-grid)" />
            </svg>

            <header
                className="absolute top-0 left-0 right-0 flex items-center px-3 z-20"
                style={{
                    height: 44,
                    borderBottom: "0.5px solid #1E1830",
                }}
            >
                {/* 
                    Spaces dropdown. 
                    For now just show the name of the active space.
                    The open/closing logic for the dropdown will be here when I make a SpaceSelector component
                */}

                <button
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                    style={{
                        background: "#1A1625",
                        border: "0.5px solid #7F52E940",
                        borderRadius: 8,
                        padding: "5px 10px",
                        color: "#C9C4D8",
                    }}
                >
                    <Layers size={14} color="#7F52E9" />
                    {activeSpace?.name ?? "Personal"}
                    <ChevronDown size={12} color="#BEB1E6" />
                </button>
            </header>

            {/*
                Main canvas. Sparks, flames, connections, everything goes here.
            */}
            <main className="aboslute inset-0 pt-11">
                {/* Placeholder for <Canvas /> */}
                <div className="w-full h-full flex items-center justify-center py-3">
                    <span style={{ color: "#BEB1E6", fontSize: 14 }}>
                        Canvas
                    </span>
                </div>
            </main>

            {/*
                Side panel.
            */}
            {showPanel && ( <SidePanel /> ) }

            {/* 
                Zoom controls.
            */}
            <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1 z-20">
                <ZoomButton icon={<Maximize2 size={13} />} label="Pantalla completa" />
                <div
                    className="flex items-center justify-center text-xs"
                    style={{
                        background: "#1A1625",
                        border: "0.5px solid #2A2438",
                        borderRadius: 6,
                        height: 28,
                        minWidth: 44,
                        padding: "0 8px",
                        color: "#BEB1E6",
                    }}
                >
                    100%
                </div>
                <ZoomButton icon={<Minus size={13} />} label="Zoom out" />
                <ZoomButton icon={<Plus size={13} />} label="Zoom in" />
            </div>
        </div>
    );
}

// --------------------------
// ZoomButton
//  Small button for the zoom controls.
//  Separated as its own component to prevent repeating the same style block four times.
// 
// For future me: When you connect the zoom logic from the UIStore, onClick goes here.
// 
// --------------------------
function ZoomButton({ icon, label }: { icon: React.ReactNode; label: string; }) {
    return (
        <button
            aria-label={label}
            className="flex items-center justify-center cursor-pointer text-sm"
            style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "0.5px solid #2A2438",
                background: "#1A1625",
                color: "#BEB1E6",
            }}
        >
            {icon}
        </button>
    );
}