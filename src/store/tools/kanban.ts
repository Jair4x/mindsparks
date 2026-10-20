//
// Store for the Kanban tool
//
// One board per Flame, at least for now.
//
// Lazily loaded the first time its Flame's Kanban is opened, then kept here for the rest of the session.
//

import { create } from "zustand";
import { KanbanCard, KanbanColumn, KanbanColumnKey } from "../../types";
import { generateId, now } from "../../lib/utils";
import { dbSelect, dbExecute } from "../../lib/db";
import { KANBAN_DEFAULT_COLUMNS, KANBAN_POSITION_STEP } from "../../lib/constants";

// --------------------------
// DB stuff
// --------------------------

interface KanbanColumnRow {
    id:         string;
    flame_id:   string;
    key:        string | null;
    position:   number;
    created_at: string;
}

interface KanbanCardRow {
    id:             string;
    column_id:      string;
    title:          string;
    description:    string | null;
    due_date:       string | null;
    position:       number;
    created_at:     string;
    updated_at:     string;
}

function rowToColumn(row: KanbanColumnRow): KanbanColumn {
    return {
        id: row.id,
        flameId: row.flame_id,
        // Nullable in the DB for the future custom columns, MVP will only have seeded ones.
        key: row.key as KanbanColumnKey,
        position: row.position,
        createdAt: row.created_at,
    };
}

function rowToCard(row: KanbanCardRow): KanbanCard {
    return {
        id: row.id,
        columnId: row.column_id,
        title: row.title,
        description: row.description ?? undefined,
        dueDate: row.due_date ?? undefined,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// One load per Flame. Guards loadBoard() against being kicked off twice because of
// React's StrictMode, and makes a board get read from the DB only once per session.
const loadPromises = new Map<string, Promise<void>>();

// --------------------------
// Store types
// --------------------------

interface KanbanBoard {
    columns:    KanbanColumn[];    // sorted by position
    cards:      KanbanCard[];      // flat, sorted by position. Grouped by columnId when rendering
}

interface KanbanStore {
    // --- State ---

    boards: Record<string, KanbanBoard>;

    // --- Actions ---

    loadBoard: (flameId: string) => Promise<void>;

    // Drop a board from memory. Used for cascade flame deletion
    clearBoard: (flameId: string) => void;
}

// --------------------------
// Store
// --------------------------

export const useKanbanStore = create<KanbanStore>((set) => ({
    boards: {},

    loadBoard: (flameId) => {
        const existing = loadPromises.get(flameId);
        if (existing) return existing;

        const promise = (async () => {
            const selectColumns = () => dbSelect<KanbanColumnRow>(
                "SELECT * FROM kanban_columns WHERE flame_id = ?1 ORDER BY position",
                [flameId]
            );

            let columnRows = await selectColumns();

            if (columnRows.length === 0) {
                for (const [idx, key] of KANBAN_DEFAULT_COLUMNS.entries()) {
                    await dbExecute(
                        "INSERT OR IGNORE INTO kanban_columns (id, flame_id, key, position, created_at VALUES (?1, ?2, ?3, ?4, ?5)",
                        [generateId(), flameId, key, (idx + 1) * KANBAN_POSITION_STEP, now()]
                    );
                }

                // Read back instead of trusting whatever we just generated
                // so if another call got there first, the rows that exist are theirs.
                columnRows = await selectColumns();
            }

            const cardRows = await dbSelect<KanbanCardRow>(
                `SELECT c.* FROM kanban_cards c 
                JOIN kanban_columns col ON col.id = c.column_id 
                WHERE col.flame_id = ?1
                ORDER BY c.position`,
                [flameId]
            );

            set((state) => ({
                boards: {
                    ...state.boards,
                    [flameId]: {
                        columns: columnRows.map(rowToColumn),
                        cards: cardRows.map(rowToCard),
                    },
                },
            }));

        })().catch((e) => {
            console.error("Couldn't load Kanban board: ", e);
            loadPromises.delete(flameId); // forget so next call can retry
        });

        loadPromises.set(flameId, promise);
        return promise;
    },

    clearBoard: (flameId) => {
        loadPromises.delete(flameId);

        set((state) => {
            const boards = { ...state.boards };
            delete boards[flameId];
            return { boards };
        });
    },
}));
