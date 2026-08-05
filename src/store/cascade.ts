//
// Cross-store cascade operations.
//
// Some deletions need to clean up dependent data that lives in other stores
// (e.g. deleting a Space should also remove every Spark/Flame/Category/Connection that belongs to it).
// 
// Centralizing that here keeps the cascade logic in one place instead of duplicating or half-implementing logic 
//  across individual store files.
//
// ! Note to future self: Once SQLite gets used, this will become mostly redundant with ON DELETE CASCADE foreign keys.
// !                      Let's keep it this simple until then.
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
