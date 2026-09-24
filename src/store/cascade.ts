//
// Cross-store cascade operations.
//
// Some deletions need to clean up dependent data that lives in other stores
// (e.g. deleting a Space should also remove every Spark/Flame/Category/Connection that belongs to it).
//
// Centralizing that here keeps the cascade logic in one place instead of duplicating or half-implementing logic
//  across individual store files.
//
// * Response to past self (check "fix(stores): space deletion now cascades onto sibling stores"):
// *    Nope, you were wrong. I'll still be using this because I decided for SQLite to be I/O for
// *    persistence instead of saving everything there. Zustand keeps being the source of truth
// *    for in-memory, and SQLite now acts as debounced, saved data. L bozo
//

import { useSparkStore } from "./sparks";
import { useFlameStore } from "./flames";
import { useCategoryStore } from "./categories";
import { useConnectionStore } from "./connections";

// --------------------------
// deleteSpaceCascade
//
// Deletes every Spark, Flame, Category and Connection belonging to a Space.
// Does NOT delete the space itself as the caller (SpaceStore.deleteSpace) owns that,
// since it also owns the isDefault guard and "reassign active space" logic.
// --------------------------
export function deleteSpaceCascade(spaceId: string): void {
    useConnectionStore.getState().deleteConnectionsBySpace(spaceId);
    useFlameStore.getState().deleteFlamesBySpace(spaceId);
    useSparkStore.getState().deleteSparksBySpace(spaceId);
    useCategoryStore.getState().deleteCategoriesBySpace(spaceId);
}

// --------------------------
// reparentNode
//
// Too lazy to give an explanation here, check the code.
// --------------------------
export function reparentNode(oldId: string, newId: string): void {
    // Repoints any connection (lineage or related) that referenced oldId.
    //  This is what reconnects a converted spark's existing parent edge
    //  to the new flame, without needing to check whether a parent existed.
    //
    // If there's nothing to repoint, this is a no-op. Plain as that.
    useConnectionStore.getState().repointNode(oldId, newId);

    // Reparents every spark/flame whose parentId pointed at oldId
    //  (covers the converted node's children, which repointNode's
    //  connection-rewrite doesn't touch since parentId is a separate field)
    useSparkStore.getState().sparks
        .filter((s) => s.parentId === oldId)
        .forEach((s) => useSparkStore.getState().reassignParent(s.id, newId));
    
    useFlameStore.getState().flames
        .filter((s) => s.parentId === oldId)
        .forEach((s) => useFlameStore.getState().reassignParent(s.id, newId));
}