//
//  For future me: I'm resolving the category deletion on memory by notifying the sparks' store.
//                 When you reach SQLite, remember to resolve this on a database level.
//                 Details on useCategoryStore -> deleteCategory.
//

import { create } from "zustand";
import { Category } from "../types";
import { useSparkStore } from "./sparks";
import { generateId, now } from "../lib/utils";

// --------------------------
// Store types
// --------------------------

interface CategoryStore {
    // --- State ---

    categories: Category[];

    // --- Actions ---

    createCategory: (params: {
        name:       string;
        color:      string;
        spaceId:    string;
    }) => Category;

    renameCategory: (id: string, name: string) => void;

    updateCategoryColor: (id: string, color: string) => void;

    deleteCategory: (id: string) => void;

    getCategoriesBySpace: (spaceId: string) => Category[];
}

// --------------------------
// Store
// --------------------------

export const useCategoryStore = create<CategoryStore>((set, get) => ({
    categories: [],

    createCategory: ({ name, color, spaceId }) => {
        const newCategory: Category = {
            id: generateId(),
            name,
            color,
            spaceId,
            createdAt: now(),
        };

        set((state) => ({ categories: [...state.categories, newCategory] }));

        return newCategory;
    },

    renameCategory: (id, name) => {
        set((state) => ({
            categories: state.categories.map((category) =>
                category.id === id
                    ? { ...category, name }
                    : category
            ),
        }));
    },

    updateCategoryColor: (id, color) => {
        set((state) => ({
            categories: state.categories.map((category) =>
                category.id === id
                    ? { ...category, color }
                    : category
            ),
        }));
    },

    deleteCategory: (id) => {
        // Before deleting the category, we unlink all the sparks that had it assigned.
        // We access directly the sparks store to do this in a single operation.
        //
        // Note to future self: This only works on memory. When you implement SQLite, this logic has to be
        //                      managed on a database level with a foreign key set as ON DELETE SET NULL,
        //                      to do exactly this but more efficiently and automatically.
        //
        const { sparks } = useSparkStore.getState();
        const affectedSparks = sparks.filter((spark) => spark.categoryId === id);

        affectedSparks.forEach((spark) => {
            useSparkStore.getState().assignCategory(spark.id, undefined);
        });

        set((state) => ({
            categories: state.categories.filter((category) => category.id !== id),
        }));
    },

    getCategoriesBySpace: (spaceId) => {
        return get().categories.filter(
            (category) => category.spaceId === spaceId
        );
    },
}));