//
// The heart (or at least the main part of it) of MindSparks.
//
// Integrates React Flow with Zustand following what I set on lib/flowTransforms.ts:
//  Zustand is the real source, React Flot only renders.
//
//

import { use, useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
    useReactFlow,
    ReactFlow,
    Background,
    BackgroundVariant,
    type NodeMouseHandler,
    type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";


import { useSparkStore, useFlameStore, useConnectionStore, useSpaceStore, useUIStore } from "../../store";
import {
    sparksAndFlamesToNodes,
    connectionsToEdges,
    type MindSparksNode,
} from "../../lib/flowTransforms";
import { SparkCard } from "./SparkCard";
import { FlameCard } from "./FlameCard";
import { isSafeZone } from "../../lib/utils";
import { SparkInput } from "./SparkInput";

// --------------------------
// Constants
// --------------------------
import { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from "../../store/ui";

// --------------------------
// Custom node Types
//
// We tell React Flow what component to render for each type of node.
//
// Note: These are Placeholders now btw, when SparkCard and FlameCard are done this'll change.
// --------------------------
const nodeTypes = {
    spark: SparkCard,
    flame: FlameCard,
};

// --------------------------
// Canvas
// --------------------------

export function Canvas() {
    const activeSpaceId = useSpaceStore((state) => state.activeSpaceId);
    const { screenToFlowPosition } = useReactFlow();
    
    const sparkInputPosition    = useUIStore((state) => state.sparkInputPosition);
    const openSparkInput        = useUIStore((state) => state.openSparkInput);
    const closeSparkInput       = useUIStore((state) => state.closeSparkInput);

    // Haven't made flames store yet, so we won't work with that yet.
    const sparks = useSparkStore(
        useShallow((state) => state.getActiveSparksBySpace(activeSpaceId))
    );

    const flames = useFlameStore(
        useShallow((state) => state.getActiveFlamesBySpace(activeSpaceId))
    );

    const connections = useConnectionStore(
        useShallow((state) => state.getConnectionsBySpace(activeSpaceId))
    );

    const nodes = sparksAndFlamesToNodes(sparks, flames);
    const edges = connectionsToEdges(connections);

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

    }, []);

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

                const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
                openSparkInput(position);
            }
        },
        [screenToFlowPosition]
    );

    return (
        <div className="w-full h-full" style={{ position: "relative"}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeDragStop={onNodeDragStop}
                onConnect={onConnect}
                onDoubleClick={onDoubleClick}
                proOptions={{ hideAttribution: true }}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                defaultViewport={{ x: 0, y: 0, zoom: DEFAULT_ZOOM }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="var(--color-accent)"
                    style={{ opacity: 0.12 }}
                />
            </ReactFlow>

            {sparkInputPosition && (
                <SparkInput
                    position={sparkInputPosition}
                    onConfirm={(text) => {
                        useSparkStore.getState().createSpark({
                            text,
                            position: sparkInputPosition,
                            spaceId: activeSpaceId,
                        });

                        closeSparkInput();
                    }}
                    onCancel={() => closeSparkInput()}
                />
            )}
        </div>
    );
}
