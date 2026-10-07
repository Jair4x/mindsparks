//
// Flame's absolute on-disk path from already-known data
//
// No rust, no scan, just string joins.
//

import { join } from "@tauri-apps/api/path";
import { getVaultState } from "./vault";

export async function resolveFlameFolderPath(
    spaceFolderName: string,
    flameFolderName: string,
    isArchived:      boolean,
): Promise<string> {
    const vaultState = await getVaultState();

    if (vaultState.status !== "ready") throw new Error("Vault isn't ready, can't resolve a Flame's folder.");

    return isArchived
        ? join(vaultState.path, "Spaces", spaceFolderName, ".archived", flameFolderName)
        : join(vaultState.path, "Spaces", spaceFolderName, flameFolderName);
}
