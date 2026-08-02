//
// Base layout for the App.
//
// Defines the whole visual structure: side panel to the left and main canvas using the rest of the space.
//  It's only use is to distribute the space on screen and react to the state of the UI (if side panel is collapsed or zen mode is active)
//

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Layers, ChevronDown, Maximize2, Minus, Plus, Flame } from "lucide-react";
import { useUIStore, useSpaceStore } from "../../store";

import { SidePanel } from "../panel/SidePanel";
import { Canvas } from "../canvas/Canvas";
import { FlameView } from "../flame/FlameView";

import { SparkModal } from "../ui/SparkModal";
import { SparkToFlameModal } from "../ui/SparkToFlameModal";

// --------------------------
// Components
// --------------------------

export function AppLayout() {
    const isPanelCollapsed  = useUIStore((state) => state.isPanelCollapsed);
    const isZenModeActive   = useUIStore((state) => state.isZenModeActive);
    
    const openSparkInput    = useUIStore((state) => state.openSparkInput);

    const activeSpace       = useSpaceStore((state) => state.getActiveSpace());
    const activeView        = useUIStore((state) => state.activeView);
    
    const showPanel         = !isPanelCollapsed && !isZenModeActive;

    return (
        <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
            {activeView === "flame" ? (
                <>
                    <FlameView />
                    <SparkModal />
                    <SparkToFlameModal />
                </>
            ) : (
                    <>
                        {/*
                            Header.
                        */}
                        <header
                            className="absolute top-0 left-0 right-0 flex items-center px-3 z-20"
                            style={{
                                height: 44,
                                borderBottom: "0.5px solid var(--color-border-subtle)",
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
                                    background: "var(--color-surface)",
                                    border: "0.5px solid var(--color-accent-muted)",
                                    borderRadius: 8,
                                    padding: "5px 10px",
                                    color: "var(--color-text)",
                                }}
                            >
                                <Layers size={14} color="var(--color-accent)" />
                                {activeSpace?.name ?? "Personal"}
                                <ChevronDown size={12} color="var(--color-accent-light)" />
                            </button>
                        </header>

                        {/*
                            Main canvas. Sparks, flames, connections, everything goes here.
                        */}
                        <main className="absolute inset-0 pt-11">
                            <ReactFlowProvider>
                                <Canvas />
                            </ReactFlowProvider>
                        </main>

                        {/*
                            Side panel.
                        */}
                        {showPanel && ( <SidePanel onCreateSpark={() => {
                            openSparkInput({
                                screen: { x: window.innerWidth / 2, y: window.innerHeight / 2 - 44 },
                                canvas: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
                            });
                        }}/> ) }
                        
                        <SparkModal />
                        <SparkToFlameModal />
                    </>
            )}
        </div>
    );
}
