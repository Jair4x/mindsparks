import { useSparkStore, useFlameStore } from "../store";

export function getChildren(parentId: string) {
    const childSparks = useSparkStore(state => state.getChildSparks(parentId));
    const childFlames = useFlameStore(state => state.getChildFlames(parentId));

    return [...childSparks, ...childFlames];
}