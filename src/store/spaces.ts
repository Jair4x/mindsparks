//
// A "Space" is a canvas with its own context.
//  The personal Space is the default and cannot be deleted.
//  Additional spaces are private by default (collaboration comes in Phase 3)
//
// This store also manages which Space is currently active, which is what the main canvas
// uses to know which sparks to show.

//
// !Note to future self: Change SpaceStore -> initializeDefaultSpace to work with SQLite to load them from the DB.
// !                     Right now, it creates the Spaces from scratch.
//

import { create } from "zustand";
import { Space, CanvasPos } from "../types";
import { generateId, now } from "../lib/utils";
import { deleteSpaceCascade } from "./cascade";

// --------------------------
// Constants
// --------------------------

const DEFAULT_VIEWPORT: CanvasPos = { x: 0, y: 0, zoom: 1 };

// --------------------------
// Store types
// --------------------------

interface SpaceStore {
    // --- State ---

    spaces: Space[];

    activeSpaceId: string;

    // --- Actions ---

    // This will be called once when loading the app
    initializeDefaultSpace: () => void;

    setActiveSpace: (id: string) => void;

    createSpace: (params: {
        name:   string;
        icon?:  string;
        color?: string;
    }) => Space;

    renameSpace: (id: string, name: string) => void;

    updateSpaceIcon: (id: string, icon: string) => void;

    updateSpaceColor: (id: string, color: string) => void;

    updateSpaceViewport: (id: string, viewport: CanvasPos) => void;

    // Delete an additional Space.
    // The default space (isDefault: true) cannot be deleted.
    // If the current Space is the one deleted, change it to the default Space.
    deleteSpace: (id: string) => void;

    getActiveSpace: () => Space;
}

// --------------------------
// Store
// --------------------------

export const useSpaceStore = create<SpaceStore>((set, get) => ({
    spaces: [],
    activeSpaceId: "",

    initializeDefaultSpace: () => {
        // Only initialize if there's no spaces yet.
        // Prevents duplicates if it gets called more than once.
        if (get().spaces.length > 0) return;

        const defaultSpace: Space = {
            id: generateId(),
            name: "Personal",
            isDefault: true,
            canvasViewport: DEFAULT_VIEWPORT,
            createdAt: now(),
            updatedAt: now(),
        };

        set({ spaces: [defaultSpace], activeSpaceId: defaultSpace.id });
    },

    setActiveSpace: (id) => {
        const exists = get().spaces.some((space) => space.id === id);
        if (!exists) return;

        set({ activeSpaceId: id });
    },

    createSpace: ({ name, icon, color }) => {
        const newSpace: Space = {
            id: generateId(),
            name,
            icon,
            color,
            isDefault: false,
            canvasViewport: DEFAULT_VIEWPORT,
            createdAt: now(),
            updatedAt: now(),
        };

        set((state) => ({ spaces: [...state.spaces, newSpace] }));

        return newSpace;
    },

    renameSpace: (id, name) => {
        set((state) => ({
            spaces: state.spaces.map((space) =>
                space.id === id
                    ? { ...space, name, updatedAt: now() }
                    : space
            )
        }));
    },

    updateSpaceIcon: (id, icon) => {
        set((state) => ({
            spaces: state.spaces.map((space) =>
                space.id === id
                    ? { ...space, icon, updatedAt: now() }
                    : space
            )
        }));
    },

    updateSpaceColor: (id, color) => {
        set((state) => ({
            spaces: state.spaces.map((space) =>
                space.id === id
                    ? { ...space, color, updatedAt: now() }
                    : space
            )
        }));
    },

    updateSpaceViewport: (id, viewport) => {
        set((state) => ({
            spaces: state.spaces.map((space) => 
                space.id === id
                    ? { ...space, canvasViewport: viewport }
                    : space
            )
        }));
    },

    deleteSpace: (id) => {
        const space = get().spaces.find((s) => s.id === id);

        if (!space || space.isDefault) return;

        // When deleting the one selected, set the active space as the default
        const { activeSpaceId, spaces } = get();
        if (activeSpaceId === id) {
            const defaultSpace = spaces.find((s) => s.isDefault);
            
            if (defaultSpace) {
                set({ activeSpaceId: defaultSpace.id });
            }
        }

        // Cascade delete, prevent orphaned references in the sibling stores
        deleteSpaceCascade(id);

        set((state) => ({
            spaces: state.spaces.filter((space) => space.id !== id),
        }));
    },

    getActiveSpace: () => {
        const { spaces, activeSpaceId } = get();
        const space = spaces.find((space) => space.id === activeSpaceId);
        
        if (!space) throw new Error(`Space ${activeSpaceId} not found`);
        return space;
    },
}));
