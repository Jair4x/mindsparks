//
// Base layout for the App.
//
// Defines the whole visual structure: side panel to the left and main canvas using the rest of the space.
//  It's only use is to distribute the space on screen and react to the state of the UI (if side panel is collapsed or zen mode is active)
//

import { useRef } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useUIStore } from "../../store";

import { SidePanel } from "../panel/SidePanel";
import { Canvas, type CanvasHandle } from "../canvas/Canvas";
import { FlameView } from "../flame/FlameView";

import { NodeInfoModal } from "../ui/NodeInfoModal";
import { SparkToFlameModal } from "../ui/SparkToFlameModal";
import { CategoryModal } from "../ui/CategoryModal";

import { HEADER_HEIGHT } from "../../lib/constants";

import { SpaceSelector } from "./SpaceSelector";
import { SpaceModal } from "../ui/SpaceModal";

// --------------------------
// Components
// --------------------------

export function AppLayout() {
    const isPanelCollapsed  = useUIStore((s) => s.isPanelCollapsed);
    const isZenModeActive   = useUIStore((s) => s.isZenModeActive);
    
    const canvasRef         = useRef<CanvasHandle>(null);

    const activeView        = useUIStore((s) => s.activeView);
    
    const showPanel         = !isPanelCollapsed && !isZenModeActive;

    return (
        <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: "var(--color-bg)" }}>
            {activeView === "flame" ? (
                <>
                    <FlameView />
                    <NodeInfoModal />
                    <SparkToFlameModal />
                    <CategoryModal />
                </>
            ) : (
                    <>
                        {/*
                            Header.
                        */}
                        <header
                            className="absolute top-0 left-0 right-0 flex items-center px-3 z-20"
                            style={{
                                height: HEADER_HEIGHT,
                                borderBottom: "0.5px solid var(--color-border-subtle)",
                            }}
                        >
                            <SpaceSelector />
                        </header>

                        {/*
                            Main canvas. Sparks, flames, connections, everything goes here.
                        */}
                        <main className="absolute inset-0 pt-11">
                            <ReactFlowProvider>
                                <Canvas ref={canvasRef} />
                            </ReactFlowProvider>
                        </main>

                        {/*
                            Side panel.
                        */}
                        {showPanel && ( <SidePanel onCreateSpark={() => canvasRef.current?.createSparkAtCenter()}/> ) }
                        
                        <NodeInfoModal />
                        <SparkToFlameModal />
                        <CategoryModal />
                        <SpaceModal />
                    </>
            )}
        </div>
    );
}
