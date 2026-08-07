//
// Functions to get the nodes related to a node.
//  [Children, Parent] (lineage) or manually related sparks
//
// Note: I forgot to make the note before lmao
//

import { useSparkStore, useFlameStore, useConnectionStore } from "../store";
import { useShallow } from "zustand/shallow";
import { useMemo } from "react";
import { Spark, Flame } from "../types";

// --------------------------
// useChildren
//  Resolves a Spark/Flame's ID to its children (aka, ideas born from other ideas).
// --------------------------
export function useChildren(parentId: string) {
    const childSparks = useSparkStore(useShallow((s) => s.getChildSparks(parentId)));
    const childFlames = useFlameStore(useShallow((s) => s.getChildFlames(parentId)));

    return useMemo(() => [...childSparks, ...childFlames], [childSparks, childFlames]);
}

// --------------------------
// useParent
//  Resolves a parentId to its Spark or Flame.
//
//  Returns undefined if there's no parentId or if it points to a node that no longer exists
//  (e.g. the parent has been deleted)
// --------------------------
export function useParent(parentId: string | undefined) {
    const parentFlame = useFlameStore((s) => (parentId ? s.getFlameById(parentId) : undefined));
    const parentSpark = useSparkStore((s) => (parentId ? s.getSparkById(parentId) : undefined));

    return parentFlame ?? parentSpark;
}

// --------------------------
// useRelated
//  Resolves a Spark/Flame's ID to the other nodes they're manually related to
//  ("related" type connections, not the parent/child "lineage" ones).
//
// Since a related Connection doesn't care which side is source/target,
//  this just returns "whichever end of the connection isn't me".
// --------------------------
export function useRelated(nodeId: string) {
    const relatedConnections = useConnectionStore(useShallow((s) => 
        s.getConnectionsByNode(nodeId).filter((c) => c.type === "related")
    ));

    const sparks = useSparkStore((s) => s.sparks);
    const flames = useFlameStore((f) => f.flames);

    return useMemo(() => {
        return relatedConnections
            .map((connection) => {
                const otherId = connection.sourceId === nodeId ? connection.targetId : connection.sourceId;
                const node: Spark | Flame | undefined =
                    sparks.find((s) => s.id === otherId) ?? flames.find((f) => f.id === otherId);
                
                return node ? { connectionId: connection.id, node } : null;
            })
            .filter((entry): entry is { connectionId: string; node: Spark | Flame } => entry !== null);
    }, [relatedConnections, sparks, flames, nodeId]);
}