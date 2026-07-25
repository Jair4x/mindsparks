// 
// The second most important part of MindSparks: Flames.
// 
// Here is where the user will work on their projects.
//  This contains the chosen schema, tools and state.
// 


import { create } from "zustand";
import { Flame, FlameSchema, FlameTool, Position } from "../types";
import { generateId, now } from "../lib/utils";
import { useConnectionStore } from "./connections";

// --------------------------
// Tools by schema
//
// When the user chooses to convert a spark into a flame and chooses a schema in the modal,
// these are the tools that are automatically pre-selected.
// The user can modify them before confirming.
// --------------------------
export const SCHEMA_DEFAULT_TOOLS: Record<FlameSchema, FlameTool[]> = {
    development: ["markdown", "kanban", "checklist"],
    research: ["markdown", "checklist"],
    custom: [],
};

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
        schema:         FlameSchema;
        tools:          FlameTool[];
        categoryId?:    string;
        parentId?:      string;
    }) => Flame;

    updateFlameName: (id: string, name: string) => void;

    moveFlameToPosition: (id: string, position: Position) => void;

    // Add a tool into the flame
    addTool: (id: string, tool: FlameTool) => void;

    removeTool: (id: string, tool: FlameTool) => void;

    assignCategory: (id: string, categoryId: string | undefined) => void;

    // Mark a flame as complete.
    completeFlame: (id: string) => void;

    // Reopen a flame that was marked as complete.
    reopenFlame: (id: string) => void;

    // Archive a flame. Doesn't delete it.
    archiveFlame: (id: string) => void;

    // Restores an archived flame.
    restoreFlame: (id: string) => void;

    getActiveFlamesBySpace: (spaceId: string) => Flame[];

    // Get the child flames from a specific flame or spark.
    // Used to show the lineage graph on hover.
    getChildFlames: (parentId: string) => Flame[];

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
        const newFlame: Flame = {
            id: generateId(),
            name,
            sparkId,
            position,
            spaceId,
            schema,
            tools,
            categoryId,
            parentId,
            isArchived: false,
            isCompleted: false,
            createdAt: now(),
            updatedAt: now(),
        };

        set((state) => ({ flames: [...state.flames, newFlame] }));

        return newFlame;
    },

    updateFlameName: (id, name) => {
        set((state) => ({
            flames: state.flames.map((flame) => 
                flame.id === id 
                    ? { ...flame, name, updatedAt: now() }
                    : flame
            ),
        }));
    },

    moveFlameToPosition: (id, position) => {
        set((state) => ({
            flames: state.flames.map((flame) => 
                flame.id === id 
                    ? { ...flame, position, updatedAt: now() }
                    : flame
            ),
        }));
    },

    addTool: (id, tool) => {
        set((state) => ({
            flames: state.flames.map((flame) => {
                if (flame.id !== id) return flame;
                if (flame.tools.includes(tool)) return flame; // TODO: Change this when the possibility to add more instances of the same tool gets made.
                
                return { ...flame, tools: [...flame.tools, tool], updatedAt: now() };
            }),
        }));
    },

    removeTool: (id, tool) => {
        set((state) => ({
            flames: state.flames.map((flame) => 
                flame.id === id
                    ? { ...flame, tools: flame.tools.filter((t) => t !== tool), updatedAt: now() }
                    : flame
            ),
        }));
    },

    assignCategory: (id, categoryId) => {
        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, categoryId, updatedAt: now() }
                    : flame
            ),
        }));
    },

    completeFlame: (id) => {
        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isCompleted: true, updatedAt: now() }
                    : flame
            ),
        }));
    },

    reopenFlame: (id) => {
        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isCompleted: false, updatedAt: now() }
                    : flame
            ),
        }));
    },

    archiveFlame: (id) => {
        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isArchived: true, updatedAt: now() }
                    : flame
            ),
        }));
    },

    restoreFlame: (id) => {
        set((state) => ({
            flames: state.flames.map((flame) =>
                flame.id === id 
                    ? { ...flame, isArchived: false, updatedAt: now() }
                    : flame
            ),
        }));
    },

    getActiveFlamesBySpace: (spaceId) => {
        return get().flames.filter(
            (flame) => flame.spaceId === spaceId && !flame.isArchived
        );
    },

    getChildFlames: (parentId) => {
        return get().flames.filter(
            (flame) => flame.parentId === parentId
        );
    },

    getFlameById: (id) => {
        return get().flames.find(
            (flame) => flame.id === id
        );
    },
}));