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
export function sparkToNode(spark: Spark): SparkNode {
    return {
        id: spark.id,
        type: "spark",
        position: spark.position,
        data: { spark },
        draggable: true,
        selectable: true,
    };
}

// --------------------------
// FlameToNode
//
// Transforms a Zustand Flame into a React Flow node.
// Same pattern as SparkToNode
// --------------------------
export function flameToNode(flame: Flame): FlameNode {
    return {
        id: flame.id,
        type: "flame",
        position: flame.position,
        data: { flame },
        draggable: true,
        selectable: true,
    };
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
        type: "default",
        style: {
            stroke: isLineage ? "var(--color-accent)" : "var(--color-border-accent)",
            strokeWidth: 1,
            strokeDasharray: isLineage ? "12 6" : "4 3",
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
export function connectionsToEdges(connections: Connection[]): Edge[] {
    return connections.map(connectionToEdge);
}
