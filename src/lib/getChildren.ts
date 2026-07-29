import { useSparkStore, useFlameStore } from "../store";
import { useShallow } from "zustand/shallow";
import { useMemo } from "react";

export function useChildren(parentId: string) {
    const childSparks = useSparkStore(useShallow((state) => state.getChildSparks(parentId)));
    const childFlames = useFlameStore(useShallow((state) => state.getChildFlames(parentId)));

    return useMemo(() => [...childSparks, ...childFlames], [childSparks, childFlames]);
}