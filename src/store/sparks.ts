import { create } from "zustand";
import { Spark, Position } from "../types";
import { generateId, now } from "../lib/utils";

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
    // Receives text and position (x, y) where user double clicked.
    createSpark: (params: {
        text:           string;
        position:       Position;
        spaceId:        string;
        categoryId?:    string;
        parentId?:      string;
    }) => Spark;

    updateSparkText: (id: string, text: string) => void;

    updateSparkDescription: (id: string, description: string) => void;

    // Called each time the user stops dragging a card.
    moveSparkToPosition: (id: string, position: Position) => void;

    // Assigns or changes the category of a spark.
    // undefined removes the sparks' category.
    assignCategory: (id: string, categoryId: string | undefined) => void;

    // Archives a spark. It doesn't delet it, just hides it from the main canvas.
    // The spark keeps existing and can be seen from the menu.
    archiveSpark: (id: string) => void;

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

    createSpark: ({ text, position, spaceId, categoryId, parentId }) => {
        const newSpark: Spark = {
            id: generateId(),
            text,
            position,
            spaceId,
            categoryId,
            parentId,
            isArchived: false,
            createdAt: now(),
            updatedAt: now(),
        };

        // add the newly created spark to the list
        set((state) => ({ sparks: [...state.sparks, newSpark] }));

        return newSpark;
    },

    updateSparkText: (id, text) => {
        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, text, updatedAt: now() }
                    : spark
            ),
        }));
    },

    updateSparkDescription: (id, description) => {
        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, description: description, updatedAt: now() }
                    : spark
            ),
        }));
    },

    moveSparkToPosition: (id, position) => {
        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, position, updatedAt: now() }
                    : spark
            ),
        }));
    },

    assignCategory: (id, categoryId) => {
        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, categoryId, updatedAt: now() }
                    : spark
            ),
        }));
    },

    archiveSpark: (id) => {
        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, isArchived: true, updatedAt: now() }
                    : spark
            ),
        }));
    },

    restoreSpark: (id) => {
        set((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.id === id
                    ? { ...spark, isArchived: false, updatedAt: now() }
                    : spark
            ),
        }));
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
        set((state) => ({
            sparks: state.sparks.map((s) =>
                s.id === id ? { ...s, parentId: newParentId, updatedAt: now() } : s
            ),
        }));
    },

    getSparkById: (id) => {
        return get().sparks.find(
            (spark) => spark.id === id
        );
    },
}));
