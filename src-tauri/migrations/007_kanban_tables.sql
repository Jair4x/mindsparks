CREATE TABLE kanban_columns (
    id TEXT PRIMARY KEY,
    flame_id TEXT NOT NULL REFERENCES flames(id) ON DELETE CASCADE,
    key TEXT, -- Translation key, for default column names
    position REAL NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (flame_id, key)
);

CREATE TABLE kanban_cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT, -- For later integration with Gantt. Kinda YAGNI rn, but meh
    position REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);