//
// The heart (or at least the main part of it) of MindSparks.
//
// Integrates React Flow with Zustand following what I set on lib/flowTransforms.ts:
//  Zustand is the real source, React Flot only renders.
//
//

import { useCallback, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { useShallow } from "zustand/shallow";
import {
    useReactFlow,
    ReactFlow,
    Background,
    BackgroundVariant,
    applyNodeChanges,
    type NodeChange,
    type NodeMouseHandler,
    type OnNodeDrag,
    type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Position } from "../../types";
import type { NodePosition } from "../../lib/repulsion";

import { handleScroll, ZoomControls } from "./ZoomControls";

import { useSparkStore, useFlameStore, useConnectionStore, useSpaceStore, useUIStore } from "../../store";
import { sparksAndFlamesToNodes, connectionsToEdges, type MindSparksNode } from "../../lib/flowTransforms";
import { isSafeZone } from "../../lib/utils";
import { animateRepulsion, resolveAllCollisions } from "../../lib/repulsion";

import { SparkCard } from "./SparkCard";
import { FlameCard } from "./FlameCard";
import { NodeCardEdge } from "./NodeCardEdge";
import { SparkInput } from "./SparkInput";
import { SelectionBox } from "./SelectionBox";
import { ContextMenu } from "./ContextMenu";

import {
    MIN_ZOOM     as MIN_ZOOM,
    MAX_ZOOM     as MAX_ZOOM,
    HEADER_HEIGHT,
    DEFAULT_CARD_WIDTH,
    DEFAULT_CARD_HEIGHT,
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

const edgeTypes = {
    center: NodeCardEdge,
};

export interface CanvasHandle {
    createSparkAtCenter: () => void;
}

// --------------------------
// Canvas
//
// Definition looks nasty, but it's to be able to expose CanvasHandle.
// --------------------------

export const Canvas = forwardRef<CanvasHandle>(function Canvas(_props, ref) {
    const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
    const { screenToFlowPosition, flowToScreenPosition, zoomTo, getZoom, getNodes } = useReactFlow();

    const sparkInputPosition = useUIStore((s) => s.sparkInputPosition);
    const openSparkInput = useUIStore((s) => s.openSparkInput);
    const closeSparkInput = useUIStore((s) => s.closeSparkInput);

    const setZoom = useUIStore((s) => s.setZoom);
    const setCanvasViewport = useUIStore((s) => s.setCanvasViewport);
    const canvasViewport = useUIStore((s) => s.canvasViewport);

    const pendingRepulsion = useUIStore((s) => s.pendingRepulsion);
    const clearPendingRepulsion = useUIStore((s) => s.clearPendingRepulsion);

    const selectNode = useUIStore((s) => s.selectNode);
    const toggleNodeSelection = useUIStore((s) => s.toggleNodeSelection);
    const clearSelection = useUIStore((s) => s.clearSelection);
    const replaceSelection = useUIStore((s) => s.replaceSelection);
    const selection = useUIStore((s) => s.selection);
    
    const isSelecting = useUIStore((s) => s.isSelecting);
    const selectionBox = useUIStore((s) => s.selectionBox);
    const startSelectionBox = useUIStore((s) => s.startSelectionBox);
    const updateSelectionBox = useUIStore((s) => s.updateSelectionBox);
    const endSelectionBox = useUIStore((s) => s.endSelectionBox);

    const openContextMenu = useUIStore((s) => s.openContextMenu);

    const sparks = useSparkStore(
        useShallow((s) => s.getActiveSparksBySpace(activeSpaceId))
    );

    const flames = useFlameStore(
        useShallow((s) => s.getActiveFlamesBySpace(activeSpaceId))
    );

    const connections = useConnectionStore(
        useShallow((s) => s.getConnectionsBySpace(activeSpaceId))
    );

    // for connection rendering
    const visibleNodeIds = useMemo(
        () => new Set([...sparks.map((s) => s.id), ...flames.map((f) => f.id)]),
        [sparks, flames]
    );
    const nodes = useMemo(
        () => sparksAndFlamesToNodes(sparks, flames),
        [sparks, flames]
    );
    const edges = useMemo(
        () => connectionsToEdges(connections, visibleNodeIds),
        [connections, visibleNodeIds]
    );

    // for selection
    const [displayNodes, setDisplayNodes] = useState(nodes);

    // --------------------------
    // resolveAndAnimateCollisions
    //
    // Shared by onNodeDragStop and the SparkInput confirm handler:
    //  given the id/position of whatever just moved or was created, 
    //  plus the full set of node positions to check against, resolves 
    //  overlaps and animates the affected nodes into their new spots.
    //  
    // affectedNodes are matched back to a Spark or Flame by ID to know 
    //  which store to persist to. A node not found in either store is
    //  silently skipped (this can maaaaybe happen for the node that was 
    //                    just dropped/created, which the caller already
    //                    excludes via droppedId).
    // --------------------------
    const resolveAndAnimateCollisions = useCallback((
        droppedId: string,
        allNodePositions: NodePosition[],
    ) => {
        const affected = resolveAllCollisions(droppedId, allNodePositions)
            .filter((n) => n.id !== droppedId);
        
        if (affected.length === 0) return;

        const startPositions = affected.map((a) => ({
            id: a.id,
            position: displayNodes.find((n) => n.id === a.id)?.position ?? a.position,
        }));

        animateRepulsion(
            startPositions,
            affected,
            // onUpdate: reflect the interpolated positions in the canvas each frame.
            (current) => {
                setDisplayNodes((prev) =>
                    prev.map((n) => {
                        const updated = current.find((c) => c.id === n.id);
                        return updated ? { ...n, position: updated.position } : n;
                    })
                );
            },
            // onComplete: persist final positions to whichever store owns each node.
            (final) => {
                for (const node of final) {
                    const spark = useSparkStore.getState().sparks.find((s) => s.id === node.id);
                    if (spark) {
                        useSparkStore.getState().moveSparkToPosition(node.id, node.position);
                        continue;
                    }

                    const flame = useFlameStore.getState().flames.find((f) => f.id === node.id);
                    if (flame) {
                        useFlameStore.getState().moveFlameToPosition(node.id, node.position);
                    }
                }
            }
        )
    }, [displayNodes]);

    // --------------------------
    // getNodeSize
    //
    // Reads the real size (height/width) that React Flow measured for a node on screen.
    // 
    // Cards have a fixed width but variable height depending on the content,
    //  so we can't assume a unique size for all of them.
    //
    // If the node wasn't rendered not even once (e.g. just created, same frame),
    //  it doesn't have `measured` yet, so we fallback to the default size.
    // --------------------------
    const getNodeSize = useCallback((id: string) => {
        const measured = getNodes().find((n) => n.id === id)?.measured;
        return {
            width: measured?.width ?? DEFAULT_CARD_WIDTH,
            height: measured?.height ?? DEFAULT_CARD_HEIGHT,
        };
    }, [getNodes]);

    // --------------------------
    // onNodeDragStop
    //
    // When the user stops dragging a node, React Flow gives us the
    // node with its new position. 
    // 
    // We notify Zustand so it updates the assigned spark or node.
    // --------------------------
    const onNodeDragStop: OnNodeDrag<MindSparksNode> = useCallback((_event, node) => {
        const typedNode = node as MindSparksNode;

        if (typedNode.type === "spark") {
            useSparkStore.getState().moveSparkToPosition(typedNode.id, typedNode.position);
        }

        if (typedNode.type === "flame") {
            useFlameStore.getState().moveFlameToPosition(typedNode.id, typedNode.position);
        }

        // Which nodes need repulsion.
        const allNodePositions = displayNodes.map((n) => ({
            id: n.id,
            position: n.position,
            size: getNodeSize(n.id),
        }));

        resolveAndAnimateCollisions(typedNode.id, allNodePositions);
    }, [displayNodes, resolveAndAnimateCollisions, getNodeSize]);

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
        (event: React.MouseEvent<HTMLDivElement>) => {
            if ((event.target as HTMLElement).classList.contains("react-flow__pane")) {
                if (!isSafeZone(event.clientX, event.clientY)) return;

                try {
                    const screenPosition = { x: event.clientX, y: event.clientY - HEADER_HEIGHT };
                    const canvasPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
                    openSparkInput({ screen: screenPosition, canvas: canvasPosition });
                } catch (e) {
                    console.error("screenToFlowPosition failed:", e);
                }
            }
        },
        [screenToFlowPosition, openSparkInput]
    );

    // --------------------------
    // handleNodeClick
    //
    // When the user clicks on a node,
    // React Flow normally manages the selection.
    // Since I don't like it, I'm gonna do mine.
    // --------------------------
    const handleNodeClick: NodeMouseHandler = (event, node) => {
        const nodeType = node.type === "spark" ? "spark" : "flame";

        if (event.ctrlKey) {
            toggleNodeSelection({
                id: node.id,
                type: nodeType,
            });
        } else {
            selectNode(node.id, nodeType);
        }
    };

    // --------------------------
    // handleSparkConfirm
    //
    // For SparkInput, resolves the creation of 
    // the spark and the close nodes collision.
    // --------------------------
    const handleSparkConfirm = useCallback((text: string) => {
        const newSpark = useSparkStore.getState().createSpark({
            text,
            position: sparkInputPosition!.canvas,
            spaceId: activeSpaceId,
        });

        const allNodePositions = displayNodes.map((n) => ({
            id: n.id,
            position: n.position,
            size: getNodeSize(n.id),
        }));

        allNodePositions.push({
            id: newSpark.id,
            position: sparkInputPosition!.canvas,
            size: getNodeSize(newSpark.id),
        });

        resolveAndAnimateCollisions(newSpark.id, allNodePositions);

        closeSparkInput();
    }, [displayNodes, sparkInputPosition, activeSpaceId, resolveAndAnimateCollisions, closeSparkInput, getNodeSize]);

    // --------------------------
    // handlePaneContextMenu / handleNodeContextMenu
    //
    // For ContextMenu, when right-clicking a single
    // node, multiple or none at all.
    // --------------------------
    const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
        event.preventDefault();

        openContextMenu({
            position: { x: event.clientX, y: event.clientY },
            nodeId: "",
            nodeType: null,
        });
    }, [openContextMenu]);

    const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
        event.preventDefault();

        const nodeType = node.type === "spark" ? "spark" : "flame";

        const alreadySelected =
            (selection.type === "single" && selection.id === node.id) ||
            (selection.type === "multi" && selection.nodes.some((n) => n.id === node.id));

        if (!alreadySelected) {
            selectNode(node.id, nodeType);
        }

        openContextMenu({
            position: { x: event.clientX, y: event.clientY },
            nodeId: node.id,
            nodeType,
        });
    
    }, [selection, selectNode, openContextMenu]);

    // --------------------------
    // Repulsion
    //
    // To call resolveAndAnimateCollisions when a new
    // node is created via duplication or child creation.
    // --------------------------
    useEffect(() => {
        if (pendingRepulsion.length === 0) return;

        /* A bit of a tangent on this:

            I have to be honest, my junior mind would probably NEVER create this displayNodePositions logic
            on its own. Copilot gave me this solution, and I REALLY dislike what I don't fully get,
            but every explanation it gave me ended with me just understanding that displayNodes is
            somehow "one render behind" when we create a new node via duplication or child nodes, and
            that we need to map it for a lookup table in order to get the updated nodes positions and
            calculate repulsion correctly and render it.
        */
        // Lookup table
        const displayNodePositions = new Map(
            displayNodes.map((n) => [n.id, n.position])
        );

        const allNodePositions = nodes.map((node) => ({
            id: node.id,
            position: displayNodePositions.get(node.id) ?? node.position,
            size: getNodeSize(node.id),
        }));

        for (const id of pendingRepulsion) {
            resolveAndAnimateCollisions(id, allNodePositions);
        }

        clearPendingRepulsion();
    }, [pendingRepulsion, displayNodes, resolveAndAnimateCollisions, clearPendingRepulsion, getNodeSize]);

    // --------------------------
    // createSparkAtCenter
    //
    // Exposed via ref so AppLayout (outside of ReactFlowProvider)
    //  can ask the creation of a centered spark without duplicating the math
    //  screenToFlowPosition does or going into UI store for something that's
    //  a specific event, not a state.
    // --------------------------
    useImperativeHandle(ref, () => ({
        createSparkAtCenter: () => {
            const visibleCenterY = (window.innerHeight - HEADER_HEIGHT) / 2;

            const centerScreen = {
                x: window.innerWidth / 2,
                y: HEADER_HEIGHT + visibleCenterY,
            };

            try {
                const canvasPosition = screenToFlowPosition(centerScreen);
                openSparkInput({
                    screen: { x: centerScreen.x, y: visibleCenterY },
                    canvas: canvasPosition,
                });
            } catch (err) {
                console.error("screenToFlowPosition failed:", err);
            }
        },
    }), [screenToFlowPosition, openSparkInput]);

    // --------------------------
    // Selection
    // --------------------------
    const onNodesChange = useCallback((changes: NodeChange<MindSparksNode>[]) => {
        setDisplayNodes((nds) =>
            applyNodeChanges<MindSparksNode>(
                changes.filter((c) => c.type !== "select"),
                nds
            )
        );
    }, []);

    const handlePaneClick = (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget) return;
        if (e.shiftKey) return; // Drag box selection

        clearSelection();
    };

    useEffect(() => {
        setDisplayNodes((prev) => {
            const prevById = new Map(prev.map((n) => [n.id, n]));

            return nodes.map((node) => {
                const isSelected =
                    selection.type === "single"
                        ? selection.id === node.id
                        : selection.type === "multi"
                            ? selection.nodes.some((n) => n.id === node.id)
                            : false;
                
                const prevNode = prevById.get(node.id);

                // If the node (position, data, etc.) and the selection flag
                // didn't change, reuse the SAME reference.
                if (
                    prevNode &&
                    prevNode.position === node.position &&
                    prevNode.data === node.data &&
                    (prevNode.selected ?? false) === isSelected
                ) {
                    return prevNode;
                }

                return prevNode
                    ? { ...prevNode, ...node, selected: isSelected }
                    : { ...node, selected: isSelected };
            });
        });
    }, [nodes, selection]);

    // For group selecting
    const getNodesInBox = useCallback((start: Position, current: Position) => {
        const left = Math.min(start.x, current.x);
        const top = Math.min(start.y, current.y);
        const right = Math.max(start.x, current.x);
        const bottom = Math.max(start.y, current.y);

        return displayNodes.filter((node) => {
            const screenPos = flowToScreenPosition(node.position);
            const rect = getNodeSize(node.id);
            const nodeWidth = rect?.width ?? node.width ?? DEFAULT_CARD_WIDTH;
            const nodeHeight = rect?.height ?? node.height ?? DEFAULT_CARD_HEIGHT;

            return (
                screenPos.x < right &&
                screenPos.x + nodeWidth > left &&
                screenPos.y < bottom &&
                screenPos.y + nodeHeight > top
            );
        })
    }, [displayNodes, flowToScreenPosition, getNodeSize]);

    const nodesInBox = useMemo(() => {
        if (!selectionBox) return [];
        return getNodesInBox(selectionBox.start, selectionBox.current);
    }, [selectionBox, getNodesInBox]);

    const handlePaneMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isSelecting) return;
        updateSelectionBox({ x: e.clientX, y: e.clientY });
    }, [isSelecting, updateSelectionBox]);

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button !== 0 || !e.shiftKey) return; // Shift + left click only

            const target = e.target as HTMLElement;
            if (!target.classList.contains("react-flow__pane")) return;

            startSelectionBox({ x: e.clientX, y: e.clientY });
        }

        document.addEventListener("mousedown", handleMouseDown, true);
        return () => document.removeEventListener("mousedown", handleMouseDown, true);
    }, [startSelectionBox]);

    useEffect(() => {
        const handleMouseUp = () => {
            if (!isSelecting || !selectionBox) return;

            const selected = getNodesInBox(selectionBox.start, selectionBox.current)
                .map((node) => ({
                    id: node.id,
                    type: node.type as "spark" | "flame",
                }));

            if (selected.length === 0) {
                replaceSelection({ type: "none" });
            } else if (selected.length === 1) {
                replaceSelection({
                    type: "single",
                    id: selected[0].id,
                    nodeType: selected[0].type,
                });
            } else {
                replaceSelection({
                    type: "multi",
                    nodes: selected,
                });
            }

            endSelectionBox();
        };

        document.addEventListener("mouseup", handleMouseUp);
        return () => document.removeEventListener("mouseup", handleMouseUp);
    }, [isSelecting, selectionBox, getNodesInBox, replaceSelection, endSelectionBox]);

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
                edgeTypes={edgeTypes}
                selectionOnDrag={false}
                selectNodesOnDrag={false}
                nodesConnectable={false}
                elementsSelectable={false}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                onNodesChange={onNodesChange}
                onNodeDragStop={onNodeDragStop}
                onPaneMouseMove={handlePaneMouseMove}
                onPaneContextMenu={handlePaneContextMenu}
                onNodeContextMenu={handleNodeContextMenu}
                selectionKeyCode={null}
                multiSelectionKeyCode={null}
                panOnDrag={!isSelecting}
                zoomOnDoubleClick={false}
                onConnect={onConnect}
                onDoubleClick={onDoubleClick}
                proOptions={{ hideAttribution: true }}
                nodeDragThreshold={1}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                defaultViewport={canvasViewport}
                zoomOnPinch={false}
                zoomOnScroll={false}
                onMoveEnd={(_, viewport) => {
                    setZoom(viewport.zoom);
                    setCanvasViewport(viewport);
                }}
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

            {selectionBox && (
                <SelectionBox
                    nodeCount={nodesInBox.length}
                />
            )}

            {sparkInputPosition && (
                <SparkInput
                    position={sparkInputPosition.screen}
                    onConfirm={handleSparkConfirm}
                    onCancel={closeSparkInput}
                />
            )}

            <ContextMenu />
        </div>
    );
});
