//
// 
//
//

import { useSparkStore, useFlameStore } from "../store";
import { useShallow } from "zustand/shallow";
import { useMemo } from "react";

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