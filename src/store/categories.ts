import { create } from "zustand";
import { Category } from "../types";
import { useSparkStore } from "./sparks";
import { useFlameStore } from "./flames";
import { generateId, now } from "../lib/utils";
import { dbSelect, dbExecute } from "../lib/db";

// --------------------------
// DB stuff
// --------------------------

// Shape of a row as it comes back from the categories table
interface CategoryRow {
    id:         string;
    name:       string;
    color:      string;
    space_id:   string;
    created_at: string;
}

function rowToCategory(row: CategoryRow): Category {
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        spaceId: row.space_id,
        createdAt: row.created_at,
    };
}

function insertCategorySql(category: Category) {
    return dbExecute(
        `INSERT INTO categories (id, name, color, space_id, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5)`,
        [
            category.id,
            category.name,
            category.color,
            category.spaceId,
            category.createdAt,
        ]
    );
}

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

    loadCategories: () => Promise<void>;

    renameCategory: (id: string, name: string) => void;

    updateCategoryColor: (id: string, color: string) => void;

    deleteCategory: (id: string) => void;

    getCategoriesBySpace: (spaceId: string) => Category[];

    // Used for cascade deletion
    deleteCategoriesBySpace: (spaceId: string) => void;
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
        insertCategorySql(newCategory).catch((e) => console.error("Couldn't persist new Category: ", e));

        return newCategory;
    },

    loadCategories: async () => {
        const rows = await dbSelect<CategoryRow>("SELECT * FROM categories");
        set({ categories: rows.map(rowToCategory) });
    },

    renameCategory: (id, name) => {
        set((state) => ({
            categories: state.categories.map((category) =>
                category.id === id
                    ? { ...category, name }
                    : category
            ),
        }));

        dbExecute(
            "UPDATE categories SET name = ?1 WHERE id = ?2",
            [name, id]
        ).catch((e) => console.error("Couldn't persist Category renaming: ", e));
    },

    updateCategoryColor: (id, color) => {
        set((state) => ({
            categories: state.categories.map((category) =>
                category.id === id
                    ? { ...category, color }
                    : category
            ),
        }));

        dbExecute(
            "UPDATE categories SET color = ?1 WHERE id = ?2",
            [color, id]
        ).catch((e) => console.error("Couldn't persist Category recoloring: ", e));
    },

    deleteCategory: (id) => {
        // SQLite handles ON DELETE SET NULL for sparks and flames.
        // Keep the in-memory stores in sync with that result.

        set((state) => ({
            categories: state.categories.filter((category) => category.id !== id),
        }));

        useSparkStore.setState((state) => ({
            sparks: state.sparks.map((spark) =>
                spark.categoryId === id
                    ? { ...spark, categoryId: undefined }
                    : spark
            ),
        }));

        useFlameStore.setState((state) => ({
            flames: state.flames.map((flame) =>
                flame.categoryId === id
                    ? { ...flame, categoryId: undefined }
                    : flame
            ),
        }));

        dbExecute(
            "DELETE FROM categories WHERE id = ?1",
            [id]
        ).catch((e) => console.error("Couldn't persist Category deletion: ", e));
    },
    
    getCategoriesBySpace: (spaceId) => {
        return get().categories.filter(
            (category) => category.spaceId === spaceId
        );
    },
    
    deleteCategoriesBySpace: (spaceId) => {
        // No need to unlink sparks/flames here (unlike deleteCategory)
        //  since the sparks and flames in this space are being deleted in the same cascade
        set((state) => ({
            categories: state.categories.filter((category) => category.spaceId !== spaceId)
        }));
    },
}));