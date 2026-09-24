//
// Global Spark/Flame position debounce for the SQLite DB.
//
// Timer resets each call, so while something is being moved, nothing is written.
//

import { Position } from "../types";
import { dbExecute } from "./db";
import { now } from "./utils";

const FLUSH_DELAY_MS = 500;

type PositionedTable = "sparks" | "flames";

interface PendingWrite {
    table:      PositionedTable;
    id:         string;
    position:   Position;
}

const pending = new Map<string, PendingWrite>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function flushPositionWrites(): Promise<void> {
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }

    if (pending.size === 0) return Promise.resolve();

    const writes = Array.from(pending.values());
    pending.clear();

    return Promise.all(
        writes.map(({ table, id, position }) =>
            dbExecute(
                `UPDATE ${table} SET position = ?1, updated_at = ?2 WHERE id = ?3`,
                [JSON.stringify(position), now(), id]
            ).catch((e) => console.error(`Couldn't persist ${table} position: `, e))
        )
    ).then(() => undefined);
}

export function queuePositionWrite(table: PositionedTable, id: string, position: Position) {
    pending.set(`${table}:${id}`, { table, id, position });

    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flushPositionWrites();
    }, FLUSH_DELAY_MS);
}
