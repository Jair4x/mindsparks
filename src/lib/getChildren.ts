import { useSparkStore, useFlameStore } from "../store";
import { useShallow } from "zustand/shallow";
import { useMemo } from "react";

export function useChildren(parentId: string) {
    const childSparks = useSparkStore(useShallow((s) => s.getChildSparks(parentId)));
    const childFlames = useFlameStore(useShallow((s) => s.getChildFlames(parentId)));

    return useMemo(() => [...childSparks, ...childFlames], [childSparks, childFlames]);
}