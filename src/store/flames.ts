// 
// The second most important part of MindSparks: Flames.
// 
// Here is where the user will work on their projects.
//  This contains the chosen schema, tools and state.
// 


import { create } from "zustand";
import { Flame, Position, ToolInstance } from "../types";
import { generateId, now } from "../lib/utils";
import { dbSelect, dbExecute } from "../lib/db";
import { queuePositionWrite } from "../lib/canvasPositionSync";

// --------------------------
// DB stuff
// --------------------------

// Shape of a row as it comes back from the flames table
interface FlameRow {
    id:             string;
    name:           string;
    spark_id:       string;
    position:       string;
    space_id:       string;
    category_id:    string | null;
    parent_id:      string | null;
    schema:         string;
    tools:          string;
    is_archived:    number;
    is_completed:   number;
    created_at:     string;
    updated_at:     string;
}

function rowToFlame(row: FlameRow): Flame {
    return {
        id: row.id,
        name: row.name,
        sparkId: row.spark_id,
        position: JSON.parse(row.position),
        spaceId: row.space_id,
        categoryId: row.category_id ?? undefined,
        parentId: row.parent_id ?? undefined,
        schema: row.schema,
        tools: JSON.parse(row.tools),
        isArchived: row.is_archived === 1,
        isCompleted: row.is_completed === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function insertFlameSql(flame: Flame) {
    return dbExecute(
        `INSERT INTO flames (id, name, spark_id, position, space_id, category_id, parent_id, schema, tools, is_archived, is_completed, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
        [
            flame.id,
            flame.name,
            flame.sparkId,
            JSON.stringify(flame.position),
            flame.spaceId,
            flame.categoryId ?? null,
            flame.parentId ?? null,
            flame.schema,
            JSON.stringify(flame.tools),
            flame.isArchived ? 1 : 0,
            flame.isCompleted ? 1 : 0,
            flame.createdAt,
            flame.updatedAt,
        ]
    );
}


// --------------------------
// Store types
// --------------------------

interface FlameStore {
    // --- State ---

    flames: Flame[];

    // --- Actions ---

    // Transforms an existent spark into a flame.
    // Makes the flame in the same position as the original spark
    // and automatically generates the lineage connection between them.
    convertSparkToFlame: (params: {
        sparkId:        string;
        name:           string;
        position:       Position;
        spaceId:        string;
        schema:         string;
        tools:          Array<string | { type: string; label?: string }>;
        categoryId?:    string;
        parentId?:      string;
    }) => Flame;

    loadFlames: () => Promise<void>;

    updateFlameName: (id: string, name: string) => void;

    moveFlameToPosition: (id: string, position: Position) => void;

    // Update the tools the flame has
    updateFlameTools: (id: string, tools: ToolInstance[]) => void;

    updateFlameSchema: (id: string, schema: string) => void;

    assignCategory: (id: string, categoryId: string | undefined) => void;

    // Mark a flame as complete.
    completeFlame: (id: string) => void;

    // Reopen a flame that was marked as complete.
    reopenFlame: (id: string) => void;

    // Archive a flame. Doesn't delete it.
    archiveFlame: (id: string) => void;

    // Restores an archived flame.
    restoreFlame: (id: string) => void;

    // Main selector the canvas uses to know what to show.
    getActiveFlamesBySpace: (spaceId: string) => Flame[];

    // Used for cascade deletion
    deleteFlamesBySpace: (spaceId: string) => void;

    // Get the child flames from a specific flame or spark.
    // Used to show the lineage graph on hover.
    getChildFlames: (parentId: string) => Flame[];

    reassignParent: (id: string, newParentId: string) => void;

    getFlameById: (id: string) => Flame | undefined;
}

// --------------------------
// Store
// --------------------------

export const useFlameStore = create<FlameStore>((set, get) => ({
    flames: [],

    convertSparkToFlame: ({
        sparkId,
        name,
        position,
        spaceId,
        schema,
        tools,
        categoryId,
        parentId,
    }) => {
        const toolInstances: ToolInstance[] = tools.map((entry) => {
            const isPlainType = typeof entry === "string";

            return {
                id: generateId(),
                type: isPlainType ? entry : entry.type,
                label: isPlainType ? undefined : entry.label,
                createdAt: now(),
            }
        });

        const newFlame: Flame = {
            id: generateId(),
            name,
            sparkId,
            position,
            spaceId,
            schema,
            tools: toolInstances,
            categoryId,
            parentId,
            isArchived: false,
            isCompleted: false,
            createdAt: now(),
            updatedAt: now(),
        };

        set((state) => ({ flames: [...state.flames, newFlame] }));
        insertFlameSql(newFlame).catch((e) => console.error("Couldn't persist new Flame: ", e));

        return newFlame;
    },

    loadFlames: async () => {
        const rows = await dbSelect<FlameRow>("SELECT * FROM flames");
        set({ flames: rows.map(rowToFlame) });
    },

    updateFlameName: (id, name) => {
        const updatedAt = now();
        
        set((state) => ({
            flames: state.flames.map((flame) => 
                flame.id === id 
                    ? { ...flame, name, updatedAt }
                    : flame
            ),
        }));

        dbExecute(
            "UPDATE flames SET name = ?1, updated_at = ?2 WHERE id = ?3",
            [name, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame name: ", e));
    },

    moveFlameToPosition: (id, position) => {
        set((state) => ({
            flames: state.flames.map((flame) => 
                flame.id === id 
                    ? { ...flame, position, updatedAt: now() }
                    : flame
            ),
        }));

        queuePositionWrite("flames", id, position);
    },

    updateFlameTools: (id, tools) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((flame) => {
                if (flame.id !== id) return flame;
                
                return { ...flame, tools, updatedAt };
            }),
        }));

        dbExecute(
            "UPDATE flames SET tools = ?1, updated_at = ?2 WHERE id = ?3",
            [tools, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame tools: ", e));
    },

    updateFlameSchema: (id, schema) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id
                    ? { ...flame, schema, updatedAt }
                    : flame
            )
        }));

        dbExecute(
            "UPDATE flames SET schema = ?1, updated_at = ?2 WHERE id = ?3",
            [schema, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame schema: ", e));
    },

    assignCategory: (id, categoryId) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, categoryId, updatedAt }
                    : flame
            ),
        }));

        dbExecute(
            "UPDATE flames SET category_id = ?1, updated_at = ?2 WHERE id = ?3",
            [categoryId, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame category: ", e));
    },

    completeFlame: (id) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isCompleted: true, updatedAt }
                    : flame
            ),
        }));

        dbExecute(
            "UPDATE flames SET is_completed = 1, updated_at = ?1 WHERE id = ?2",
            [updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame completion: ", e));
    },

    reopenFlame: (id) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isCompleted: false, updatedAt }
                    : flame
            ),
        }));

        dbExecute(
            "UPDATE flames SET is_completed = 0, updated_at = ?1 WHERE id = ?2",
            [updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame reopening: ", e));
    },

    archiveFlame: (id) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isArchived: true, updatedAt }
                    : flame
            ),
        }));

        dbExecute(
            "UPDATE flames SET is_completed = 1, updated_at = ?1 WHERE id = ?2",
            [updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame archiving: ", e));
    },

    restoreFlame: (id) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isArchived: false, updatedAt }
                    : flame
            ),
        }));

        dbExecute(
            "UPDATE flames SET is_archived = 0, updated_at = ?1 WHERE id = ?2",
            [updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame restoring: ", e));
    },

    getActiveFlamesBySpace: (spaceId) => {
        return get().flames.filter(
            (flame) => flame.spaceId === spaceId && !flame.isArchived
        );
    },

    deleteFlamesBySpace: (spaceId) => {
        set((state) => ({
            flames: state.flames.filter((flame) => flame.spaceId !== spaceId)
        }));
    },

    getChildFlames: (parentId) => {
        return get().flames.filter(
            (flame) => flame.parentId === parentId
        );
    },

    reassignParent: (id, newParentId) => {
        const updatedAt = now();

        set((state) => ({
            flames: state.flames.map((s) =>
                s.id === id ? { ...s, parentId: newParentId, updatedAt } : s
            ),
        }));

        dbExecute(
            "UPDATE flames SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
            [newParentId, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Flame parent reassigning: ", e));
    },

    getFlameById: (id) => {
        return get().flames.find(
            (flame) => flame.id === id
        );
    },
}));