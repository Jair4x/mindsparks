import { create } from "zustand";
import { Spark, Position } from "../types";
import { generateId, now } from "../lib/utils";
import { dbSelect, dbExecute } from "../lib/db";
import { queuePositionWrite } from "../lib/canvasPositionSync";

// --------------------------
// DB stuff
// --------------------------

// Shape of a row as it comes back from the sparks table
interface SparkRow {
    id:                     string;
    name:                   string;
    description:            string | null;
    position:               string;
    space_id:               string;
    category_id:            string | null;
    parent_id:              string | null;
    is_archived:            number;
    is_converted_to_flame:  number;
    created_at:             string;
    updated_at:             string;
}

function rowToSpark(row: SparkRow): Spark {
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        position: JSON.parse(row.position),
        spaceId: row.space_id,
        categoryId: row.category_id ?? undefined,
        parentId: row.parent_id ?? undefined,
        isArchived: row.is_archived === 1,
        isConvertedToFlame: row.is_converted_to_flame === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function insertSparkSql(spark: Spark) {
    return dbExecute(
        `INSERT INTO sparks (id, name, description, position, space_id, category_id, parent_id, is_archived, is_converted_to_flame, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
        [
            spark.id,
            spark.name,
            spark.description ?? null,
            JSON.stringify(spark.position),
            spark.spaceId,
            spark.categoryId ?? null,
            spark.parentId ?? null,
            spark.isArchived ? 1 : 0,
            spark.isConvertedToFlame ? 1 : 0,
            spark.createdAt,
            spark.updatedAt,
        ]
    );
}

// --------------------------
// Store types
// --------------------------

//
// SparkStore
//  Defines the complete "form" of the store: what data comes and what functions it exposes.
//
interface SparkStore {
    // --- State ---

    // List of all sparks in memory.
    // Includes both actives and archived ones.
    sparks: Spark[];

    // --- Actions ---

    // Creates a new spark in a specific position in the canvas.
    createSpark: (params: {
        name:           string;
        position:       Position;
        spaceId:        string;
        categoryId?:    string;
        parentId?:      string;
    }) => Spark;

    loadSparks: () => Promise<void>;

    updateSparkName: (id: string, name: string) => void;

    updateSparkDescription: (id: string, description: string) => void;

    // Called each time the user stops dragging a card.
    moveSparkToPosition: (id: string, position: Position) => void;

    // Assigns or changes the category of a spark.
    // undefined removes the sparks' category.
    assignCategory: (id: string, categoryId: string | undefined) => void;

    // Archives a spark. It doesn't delet it, just hides it from the main canvas.
    // The spark keeps existing and can be seen from the menu.
    archiveSpark: (id: string) => void;

    // Converts a spark into a flame
    convertSparkToFlame: (id: string) => void;

    // Restores an archived spark to the canvas.
    restoreSpark: (id: string) => void;

    // Main selector the canvas uses to know what to show.
    getActiveSparksBySpace: (spaceId: string) => Spark[];

    // Used for cascade deletion
    deleteSparksBySpace: (spaceId: string) => void;

    // Get the child sparks from a specific flame or spark.
    // Used to show the lineage graph on hover.
    getChildSparks: (parentId: string) => Spark[];

    reassignParent: (id: string, newParentId: string) => void;

    getSparkById: (id: string) => Spark | undefined;
}

// --------------------------
// Store
// --------------------------

export const useSparkStore = create<SparkStore>((set, get) => ({
    sparks: [],

    createSpark: ({ name, position, spaceId, categoryId, parentId }) => {
        const newSpark: Spark = {
            id: generateId(),
            name,
            position,
            spaceId,
            categoryId,
            parentId,
            isArchived: false,
            isConvertedToFlame: false,
            createdAt: now(),
            updatedAt: now(),
        };

        // add the newly created spark to the list
        set((state) => ({ sparks: [...state.sparks, newSpark] }));
        insertSparkSql(newSpark).catch((e) => console.error("Couldn't persist new Spark: ", e));

        return newSpark;
    },

    loadSparks: async () => {
        const rows = await dbSelect<SparkRow>("SELECT * FROM sparks");
        set({ sparks: rows.map(rowToSpark) });
    },

    updateSparkName: (id, name) => {
        const updatedAt = now();

        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
            ? { ...spark, name, updatedAt }
            : spark
        ),
        }));
        
        dbExecute(
            "UPDATE sparks SET name = ?1, updated_at = ?2 WHERE id = ?3",
            [name, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Spark name: ", e));
    },

    updateSparkDescription: (id, description) => {
        const updatedAt = now();

        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                ? { ...spark, description: description, updatedAt }
                : spark
            ),
        }));

        dbExecute(
            "UPDATE sparks SET description = ?1, updated_at = ?2 WHERE id = ?3",
            [description, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Spark description: ", e));
    },

    moveSparkToPosition: (id, position) => {
        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, position, updatedAt: now() }
                    : spark
            ),
        }));

        queuePositionWrite("sparks", id, position);
    },

    assignCategory: (id, categoryId) => {
        const updatedAt = now();

        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, categoryId, updatedAt }
                    : spark
            ),
        }));

        dbExecute(
            "UPDATE sparks SET category_id = ?1, updated_at = ?2 WHERE id = ?3",
            [categoryId, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Spark category: ", e));
    },

    archiveSpark: (id) => {
        const updatedAt = now();

        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                ? { ...spark, isArchived: true, updatedAt }
                : spark
            ),
        }));

        dbExecute(
            "UPDATE sparks SET is_archived = 1, updated_at = ?1 WHERE id = ?2",
            [updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Spark archiving: ", e));
    },

    convertSparkToFlame: (id) => {
        const updatedAt = now();

        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? {
                        ...spark,
                        isArchived: true,
                        isConvertedToFlame: true,
                        parentId: undefined,
                        updatedAt
                    }
                    : spark
            ),
        }));

        dbExecute(
            "UPDATE sparks SET is_archived = 1, is_converted_to_flame = 1, updated_at = ?1 WHERE id = ?2",
            [updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Spark conversion: ", e));
    },

    restoreSpark: (id) => {
        const updatedAt = now();

        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, isArchived: false, updatedAt }
                    : spark
            ),
        }));

        dbExecute(
            "UPDATE sparks SET is_archived = 0, updated_at = ?1 WHERE id = ?2",
            [updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Spark restore: ", e));
    },

    getActiveSparksBySpace: (spaceId) => {
        return get().sparks.filter(
            (spark) => spark.spaceId === spaceId && !spark.isArchived
        );
    },

    deleteSparksBySpace: (spaceId) => {
        set((state) => ({
            sparks: state.sparks.filter((spark) => spark.spaceId !== spaceId)
        }));
    },

    getChildSparks: (parentId) => {
        return get().sparks.filter(
            (spark) => spark.parentId === parentId
        );
    },

    reassignParent: (id, newParentId) => {
        const updatedAt = now();

        set((state) => ({
            sparks: state.sparks.map((s) =>
                s.id === id ? { ...s, parentId: newParentId, updatedAt } : s
            ),
        }));

        dbExecute(
            "UPDATE sparks SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
            [newParentId, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Spark parent reassignment: ", e));
    },

    getSparkById: (id) => {
        return get().sparks.find(
            (spark) => spark.id === id
        );
    },
}));
