//
// Magnetic repulsion between in the canvas.
//
// Use:
//  When the user drops a node inside or too close to another,
//  the nearby nodes are softly pushed away in the opposite direction
//  of the dropped node.
//
// Note:
//  This includes a lot of math, so I did get some help from AI to know what math function to use and why.
//

import type { Position } from "../types";
import {
    REPULSION_RADIUS,
    REPULSION_MAX_FORCE as MAX_FORCE,
    REPULSION_DURATION  as ANIMATION_DURATION,
} from "./constants";

// --------------------------
// Types
// --------------------------

export interface NodePosition {
    id: string;
    position: Position;
}


// --------------------------
// CalculateRepulsion
//
// Given the dropped node and every node in the canvas,
// calculate the final positions of the nodes that need to be moved.
//
// Only returns the affected nodes with their new positions.
// --------------------------
function calculateRepulsion(
    droppedId:          string,
    droppedPosition:    Position,
    allNodes:           NodePosition[]
): NodePosition[] {
    const affected: NodePosition[] = [];

    for (const node of allNodes) {
        if (node.id === droppedId) continue;

        const dx = node.position.x - droppedPosition.x;
        const dy = node.position.y - droppedPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy); // sqrt of dx² + dy²

        if (distance >= REPULSION_RADIUS) continue;

        // Max force is applied when distance is 0 and 0, AKA distance === REPULSION_RADIUS.
        const force = MAX_FORCE * (1 - distance / REPULSION_RADIUS);

        // Normalize the vector's direction to apply force
        // If distance is 0, push in a random distance.
        const angle = distance === 0 ? Math.random() * Math.PI * 2 : Math.atan2(dy, dx);

        affected.push({
            id: node.id,
            position: {
                x: node.position.x + Math.cos(angle) * force,
                y: node.position.y + Math.sin(angle) * force,
            },
        });
    }

    return affected;
}


// --------------------------
// AnimateRepulsion
//
// Animates the movement of the affected nodes from their current position
// until their final position.
//
// onUpdate is called on each frame with the interpolated positions of all the affected nodes
// so the Canvas can update displayNodes.
//
// onComplete is called when the animation finishes with the final positions so Zustand can save them.
// --------------------------
export function animateRepulsion(
    startPositions: NodePosition[],
    endPositions:   NodePosition[],
    onUpdate:       (positions: NodePosition[]) => void,
    onComplete:     (positions: NodePosition[]) => void,
): void {
    const startTime = performance.now();

    const startMap = new Map(startPositions.map((n) => [n.id, n.position]));

    function frame(now: number) {
        const elapsed       = now - startTime;
        const rawProgress   = elapsed / ANIMATION_DURATION;
        
        // Ease out cubic for the animation do de-accelerate towards the end.
        const progress  = Math.min(1, rawProgress);
        const eased     = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate between initial and final position for each affected node.
        const current = endPositions.map((end) => {
            const start = startMap.get(end.id);
            if (!start) return end;

            return {
                id: end.id,
                position: {
                    x: start.x + (end.position.x - start.x) * eased,
                    y: start.y + (end.position.y - start.y) * eased,
                },
            };
        });

        onUpdate(current);

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            onComplete(endPositions);
        }
    }

    requestAnimationFrame(frame);
}


// --------------------------
// ResolveAllCollisions
//
// Since repulsion moves nodes out of the way, other nodes may be collaterally affected,
// so we just call calculateRepulsion over 10 (max) iterations so there's no problems
// like nodes affected ending up above another node.
// --------------------------
export function resolveAllCollisions(
    droppedId:          string,
    movedPosition:      Position,
    allNodes:           NodePosition[],
    maxIterations = 10
): NodePosition[] {
    let current = [...allNodes];
    let changed = true;
    let iterations = 0;

    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;
        
        for (const node of current) {
            const affected = calculateRepulsion(node.id, node.position, current);
            if (affected.length === 0) continue;

            changed = true;
            for (const a of affected) {
                if (a.id === droppedId) continue; // Don't touch the node the user dropped

                const idx = current.findIndex((n) => n.id === a.id);
                if (idx !== -1) current[idx] = a;
            }
        }
    }

    return current;
}