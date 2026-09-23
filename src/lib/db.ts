//
// Contact point between Tauri and this, the frontend, for raw SQL access.
//
// Generic on purpose, since it mirrors db_select/db_execute from src-tauri/src/db.rs
//  Rust doesn't know about our data model, neither does this file.
//
// Table-specific queries and row-mapping live in the store that owns that table
//

import { invoke } from "@tauri-apps/api/core";

export interface DbExecuteResult {
    rowsAffected: number;
    lastInsertId: number;
}

export async function dbSelect<T = Record<string, unknown>>(
    query: string,
    params: unknown[] = []
): Promise<T[]> {
    return invoke<T[]>("db_select", { query, params });
}

export async function dbExecute(
    query: string,
    params: unknown[] = []
): Promise<DbExecuteResult> {
    return invoke<DbExecuteResult>("db_execute", { query, params });
}
