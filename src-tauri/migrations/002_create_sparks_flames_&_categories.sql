CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE TABLE sparks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    position TEXT NOT NULL,
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    parent_id TEXT,
    is_archived INTEGER NOT NULL,
    is_converted_to_flame INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE flames (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    spark_id TEXT NOT NULL REFERENCES sparks(id) ON DELETE CASCADE,
    position TEXT NOT NULL,
    space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    parent_id TEXT,
    schema TEXT NOT NULL,
    tools TEXT NOT NULL,
    is_archived INTEGER NOT NULL,
    is_completed INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);