//
// The heart (or at least the main part of it) of MindSparks.
//
// Integrates React Flow with Zustand following what I set on lib/flowTransforms.ts:
//  Zustand is the real source, React Flot only renders.
//
//

import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
    useReactFlow,
    ReactFlow,
    Background,
    BackgroundVariant,
    applyNodeChanges,
    type NodeChange,
    type NodeMouseHandler,
    type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { handleScroll, ZoomControls } from "./ZoomControls";


import { useSparkStore, useFlameStore, useConnectionStore, useSpaceStore, useUIStore } from "../../store";
import { sparksAndFlamesToNodes, connectionsToEdges, type MindSparksNode } from "../../lib/flowTransforms";
import { isSafeZone } from "../../lib/utils";
import { animateRepulsion, resolveAllCollisions } from "../../lib/repulsion";

import { SparkCard } from "./SparkCard";
import { FlameCard } from "./FlameCard";
import { SparkInput } from "./SparkInput";

import {
    MIN_ZOOM     as MIN_ZOOM,
    MAX_ZOOM     as MAX_ZOOM,
    DEFAULT_ZOOM as DEFAULT_ZOOM
} from "../../lib/constants";

// --------------------------
// Custom node Types
//
// We tell React Flow what component to render for each type of node.
// --------------------------
const nodeTypes = {
    spark: SparkCard,
    flame: FlameCard,
};

// --------------------------
// Canvas
// --------------------------

export function Canvas() {
    const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
    const { screenToFlowPosition, zoomTo, getZoom } = useReactFlow();
    
    const sparkInputPosition    = useUIStore((s) => s.sparkInputPosition);
    const openSparkInput        = useUIStore((s) => s.openSparkInput);
    const closeSparkInput       = useUIStore((s) => s.closeSparkInput);
    
    const setZoom = useUIStore((s) => s.setZoom);

    const sparks = useSparkStore(
        useShallow((s) => s.getActiveSparksBySpace(activeSpaceId))
    );

    const flames = useFlameStore(
        useShallow((s) => s.getActiveFlamesBySpace(activeSpaceId))
    );

    const connections = useConnectionStore(
        useShallow((s) => s.getConnectionsBySpace(activeSpaceId))
    );

    const nodes = sparksAndFlamesToNodes(sparks, flames);
    const edges = connectionsToEdges(connections);
    
    const [displayNodes, setDisplayNodes] = useState(nodes);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setDisplayNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    useEffect(() => {
        setDisplayNodes(nodes);
    }, [sparks, flames]);
    
    // --------------------------
    // onNodeDragStop
    //
    // When the user stops dragging a node, React Flow gives us the
    // node with its new position. 
    // 
    // We notify Zustand so it updates the assigned spark or node.
    // --------------------------
    const onNodeDragStop: NodeMouseHandler = useCallback((_event, node) => {
        const typedNode = node as MindSparksNode;

        if (typedNode.type === "spark") {
            useSparkStore
                .getState()
                .moveSparkToPosition(typedNode.id, typedNode.position);
        }

        if (typedNode.type === "flame") {
            useFlameStore
                .getState()
                .moveFlameToPosition(typedNode.id, typedNode.position);
        }

        // Which nodes need repulsion.
        const allNodePositions = displayNodes.map((n) => ({
            id:         n.id,
            position:   n.position,
        }));

        const affected = resolveAllCollisions(typedNode.id, typedNode.position, allNodePositions);

        if (affected.length === 0) return;

        const startPositions = affected.map((a) => ({
            id:         a.id,
            position:   displayNodes.find((n) => n.id === a.id)!.position,
        }));

        animateRepulsion(
            startPositions,
            affected,
            // onUpdate updates displayNodes in each frame to animate them
            (current) => {
                setDisplayNodes((prev) =>
                    prev.map((n) => {
                        const updated = current.find((c) => c.id === n.id);
                        return updated ? { ...n, position: updated.position } : n;
                    })
                );
            },
            // onComplete persists the final positions on Zustand
            (final) => {
                for (const node of final) {
                    const spark = useSparkStore.getState().sparks.find((s) => s.id === node.id);
                    if (spark) {
                        useSparkStore.getState().moveSparkToPosition(node.id, node.position);
                        continue;
                    }

                    useFlameStore.getState().moveFlameToPosition(node.id, node.position);
                }
            }
        );
    }, [displayNodes]);

    // --------------------------
    // onConnect
    //
    // When the user connects two nodes by dragging from a handle,
    // React Flow gives us the source and target.
    //  By default we create a "related" type connection.
    //  The "lineage" type connections are automatically generated
    //  When a spark performs self-pregnancy and bears a child, or said child turns itself into a flame.
    //
    // --------------------------
    const onConnect: OnConnect = useCallback(
        (connection) => {
            if (!connection.source || !connection.target) return;

            useConnectionStore.getState().createRelatedConnection({
                sourceId: connection.source,
                targetId: connection.target,
                spaceId: activeSpaceId
            })
        },
        [activeSpaceId]
    );

    // --------------------------
    // onDoubleClick
    //
    // When the user double clicks in the canvas' background (not a node),
    // React Flow gives us the mouse event. So we use the canvas coordinates
    // to create the spark in the correct position.
    // --------------------------
    const onDoubleClick = useCallback(
        (event: React.MouseEvent) => {
            if ((event.target as HTMLElement).classList.contains("react-flow__pane")) {
                if (!isSafeZone(event.clientX, event.clientY)) return;

                try {
                    const screenPosition = { x: event.clientX, y: event.clientY - 44 }; // minus 44px because the canvas container div starts on pt-11 (44px from top)
                    const canvasPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
                    openSparkInput({ screen: screenPosition, canvas: canvasPosition });
                } catch (e) {
                    console.error("screenToFlowPosition failed:", e);
                }
            }
        },
        [screenToFlowPosition, openSparkInput]
    );

    return (
        <div
            className="w-full h-full"
            style={{ position: "relative" }}
            onWheel={(e) => handleScroll(e, getZoom, zoomTo, setZoom)}
        >
            <ReactFlow
                nodes={displayNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                zoomOnDoubleClick={false}
                onConnect={onConnect}
                onDoubleClick={onDoubleClick}
                proOptions={{ hideAttribution: true }}
                nodeDragThreshold={1}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                defaultViewport={{ x: 0, y: 0, zoom: DEFAULT_ZOOM }}
                zoomOnPinch={false}
                zoomOnScroll={false}
                onMoveEnd={(_, viewport) => setZoom(viewport.zoom)}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="var(--color-accent)"
                    style={{ opacity: 0.12 }}
                />

                <ZoomControls />
            </ReactFlow>

            {sparkInputPosition && (
                <SparkInput
                    position={sparkInputPosition.screen}
                    onConfirm={(text) => {
                        const newSpark = useSparkStore.getState().createSpark({
                            text,
                            position: sparkInputPosition.canvas,
                            spaceId: activeSpaceId,
                        });

                        // Resolve collisions
                        const allNodePositions = displayNodes.map((n) => ({
                            id: n.id,
                            position: n.position,
                        }));

                        // Add the newly created spark to the list so it becomes a source of repulsion
                        allNodePositions.push({ id: newSpark.id, position: sparkInputPosition.canvas });

                        const resolved = resolveAllCollisions(newSpark.id, sparkInputPosition.canvas, allNodePositions);

                        const affected = resolved.filter((n) => n.id !== newSpark.id);

                        if (affected.length > 0) {
                            const startPositions = affected.map((a) => ({
                            id: a.id,
                            position: displayNodes.find((n) => n.id === a.id)?.position ?? a.position,
                            }));

                            animateRepulsion(startPositions, affected, 
                            (current) => {
                                setDisplayNodes((prev) =>
                                prev.map((n) => {
                                    const updated = current.find((c) => c.id === n.id);
                                    return updated ? { ...n, position: updated.position } : n;
                                })
                                );
                            },
                            (final) => {
                                for (const node of final) {
                                useSparkStore.getState().moveSparkToPosition(node.id, node.position);
                                }
                            }
                            );
                        }

                        closeSparkInput();
                    }}
                    onCancel={closeSparkInput}
                />
            )}
        </div>
    );
}
