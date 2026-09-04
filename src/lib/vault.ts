//
// Contact point between Tauri and this, the frontend.
//

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Mirrors enum VaultState from src-tauri/src/vault.rs
export type VaultState =
    | { status: "not_set" }
    | { status: "missing"; path: string }
    | { status: "ready"; path: string };

export async function getVaultState(): Promise<VaultState> {
    return invoke<VaultState>("get_vault_state");
}

export async function setVaultPath(path: string): Promise<VaultState> {
    return invoke<VaultState>("set_vault_path", { path });
}

export async function pickVaultFolder(): Promise<string | null> {
    const selected = await open({
        directory: true,
        multiple: false,
        title: "Choose your MindSparks Vault",
    });

    return typeof selected === "string" ? selected : null;
}