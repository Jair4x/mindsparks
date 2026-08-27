//
// Integration between Zustand and React Flow.
//
// This integration was made because my Zustand Store's and React Flow's nodes/edges have different structure.
//  React Flow wants the following structure:
//      Nodes: { id: string, type: string, position: { x, y }, data: any }
//      Edges: { id: string, source: string, target: string, type?: string }
//
// Our Sparks, Flames and Connections have more fields and a different structure to satisfy what I need.
// So, instead of deleting or using one over the other, I'll make this file, which centralizes the conversion
//  between data structures so the Canvas doesn't need to know anything about the internal format of React Flow,
//  and Zustand doesn't need to know anything about React Flow.
//
// The solution?
//  Zustand is the real source. React Flow only renders.
//  We never modify the state of React Flow directly, we always update Zustand first and let React Flow re-render.
//

import type { Node, Edge } from "@xyflow/react";
import type { Spark, Flame, Connection } from "../types";
import { Position } from "@xyflow/react";
import { DEFAULT_CARD_WIDTH } from "./constants";

const CARD_HANDLES = [
    { type: "source" as const, position: Position.Top, x: DEFAULT_CARD_WIDTH / 2, y: 0, width: 1, height: 1 },
    { type: "target" as const, position: Position.Top, x: DEFAULT_CARD_WIDTH / 2, y: 0, width: 1, height: 1 },
];

// --------------------------
// Custom node types
//
// React Flow distinguishes node types by the "type" field.
// We're gonna use them to know what component to render in the canvas:
//  "spark" renders SparkCard (components/canvas/SparkCard.tsx)
//  "flame" renders FlameCard (components/canvas/FlameCard.tsx)
// --------------------------
export type SparkNodeType = "spark";
export type FlameNodeType = "flame";

// Since the "data" field in a React Flow node is any, we specifically type what data
// gets delivered by each type of node so TS helps me when I access node.data later on.
export type SparkNodeData = { spark: Spark };
export type FlameNodeData = { flame: Flame };

export type SparkNode = Node<SparkNodeData, SparkNodeType>;
export type FlameNode = Node<FlameNodeData, FlameNodeType>;
export type MindSparksNode = SparkNode | FlameNode;

// --------------------------
// SparkToNode
//
// Transforms a Zustand Spark into a React Flow node.
// The position comes directly from the spark, which already saves x/y coordinates.
// 
// The full spark goes in data.spark so the SparkCard component can read any field
//  without needing any additional props.
// --------------------------
const sparkNodeCache = new WeakMap<string, SparkNode>();
function sparkToNode(spark: Spark): SparkNode {
    const cached = sparkNodeCache.get(spark);
    if (cached) return cached;

    const node: SparkNode = {
        id: spark.id,
        type: "spark",
        position: spark.position,
        data: { spark },
        draggable: true,
        selectable: false,
        handles: CARD_HANDLES,
    };
    sparkNodeCache.set(spark, node);
    return node;
}

// --------------------------
// FlameToNode
//
// Transforms a Zustand Flame into a React Flow node.
// Same pattern as SparkToNode
// --------------------------
const flameNodeCache = new WeakMap<string, FlameNode>();

function flameToNode(flame: Flame): FlameNode {
    const cached = flameNodeCache.get(flame);
    if (cached) return cached;

    const node: FlameNode = {
        id: flame.id,
        type: "flame",
        position: flame.position,
        data: { flame },
        draggable: true,
        selectable: false,
        handles: CARD_HANDLES,
    };
    flameNodeCache.set(flame, node);
    return node;
}

// --------------------------
// ConnectionToEdge
//
// Transforms a Zustand Connection into a React Flow edge.
//
// The "lineage" type connections are drawn as solid lines.
// The "related" type connections are drawn as dotted lines.
// --------------------------
export function connectionToEdge(connection: Connection): Edge {
    const isLineage = connection.type === "lineage";

    return {
        id: connection.id,
        source: connection.sourceId,
        target: connection.targetId,
        type: "center",
        style: {
            stroke: isLineage ? "var(--color-accent)" : "var(--color-border-accent)",
            strokeWidth: 1,
            strokeDasharray: isLineage ? "8 2" : "6 4",
            opacity: isLineage ? 0.4 : 0.7,
        },
        animated: true, //* Might change this to isLineage if lineage and related lines get easily confused.
    };
}

// --------------------------
// SparksAndFlamesToNodes
//
// Transforms spark and flame arrays into a unified array of React Flow nodes.
//
// This'll get called by the canvas giving the current Space data to obtain all the nodes in one go.
// --------------------------
export function sparksAndFlamesToNodes(
    sparks: Spark[],
    flames: Flame[]
): MindSparksNode[] {
    return [
        ...sparks.map(sparkToNode),
        ...flames.map(flameToNode),
    ];
}

// --------------------------
// ConnectionsToEdges
//
// Transforms an array of connections into React Flow edges.
// --------------------------
export function connectionsToEdges(connections: Connection[], visibleNodeIds: Set<string>): Edge[] {
    return connections
        .filter((c) => visibleNodeIds.has(c.sourceId) && visibleNodeIds.has(c.targetId))
        .map(connectionToEdge);
}
