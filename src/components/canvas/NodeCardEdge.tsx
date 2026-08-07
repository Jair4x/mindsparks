//
// I tried to use ReactFlow's built-in Handles, but since ReactFlow 
//  doesn't have a way to center connection edges,
//  I had to make my own custom implementation, yay.
//
// Done with A LITTLE help from AI, since I didn't get how React Flow
//  manages edges and how to implement my own custom edge.
//

import { BaseEdge, getStraightPath, useInternalNode, type EdgeProps } from "@xyflow/react";
import type { MindSparksNode } from "../../lib/flowTransforms";

// --------------------------
// Helper functions
// --------------------------

function getNodeCenter(node: ReturnType<typeof useInternalNode<MindSparksNode>>) {
    if (!node) return null;

    const { positionAbsolute } = node.internals;
    const width = node.width ?? node.measured.width ?? 0;
    const height = node.height ?? node.measured.height ?? 0;

    return {
        x: positionAbsolute.x + width / 2,
        y: positionAbsolute.y + height / 2,
    };
}

// --------------------------
// NodeCardEdge
// --------------------------

export function NodeCardEdge({
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style,
    markerStart,
    markerEnd,
    interactionWidth,
}: EdgeProps) {
    const sourceNode = useInternalNode<MindSparksNode>(source);
    const targetNode = useInternalNode<MindSparksNode>(target);

    const sourceCenter = getNodeCenter(sourceNode) ?? { x: sourceX, y: sourceY };
    const targetCenter = getNodeCenter(targetNode) ?? { x: targetX, y: targetY };

    const [path] = getStraightPath({
        sourceX: sourceCenter.x,
        sourceY: sourceCenter.y,
        targetX: targetCenter.x,
        targetY: targetCenter.y,
    });

    return (
        <BaseEdge
            path={path}
            style={style}
            markerStart={markerStart}
            markerEnd={markerEnd}
            interactionWidth={interactionWidth}
        />
    );
}