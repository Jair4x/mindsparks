//
// A "Space" is a canvas with its own context.
//  The personal Space is the default and cannot be deleted.
//  Additional spaces are private by default (collaboration comes in Phase 3)
//
// This store also manages which Space is currently active, which is what the main canvas
// uses to know which sparks to show.
//
//
// Zustand stays the in-memory source of truth during a session. Every mutating action below also fires
//  a DB write as a side effect, fire-and-forget: the store updates immediately so the UI never waits on IPC,
//  and the write happens in the background.
//
// TODO: Failures are just logged, change it when you (future me) make some error-surfacing UI.
//

import { create } from "zustand";
import { Space, CanvasPos } from "../types";
import { generateId, now } from "../lib/utils";
import { deleteSpaceCascade } from "./cascade";
import { dbSelect, dbExecute } from "../lib/db";

// --------------------------
// Constants
// --------------------------

const DEFAULT_VIEWPORT: CanvasPos = { x: 0, y: 0, zoom: 1 };

// --------------------------
// DB stuff
// --------------------------

// Shape of a row as it comes back from the spaces table
interface SpaceRow {
    id:                 string;
    name:               string;
    icon:               string | null;
    color:              string | null;
    is_default:         number;
    canvas_viewport:    string;
    created_at:         string;
    updated_at:         string;
}

function rowToSpace(row: SpaceRow): Space {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon ?? undefined,
        color: row.color ?? undefined,
        isDefault: row.is_default === 1,
        canvasViewport: JSON.parse(row.canvas_viewport),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function insertSpaceSql(space: Space) {
    return dbExecute(
        `INSERT INTO spaces (id, name, icon, color, is_default, canvas_viewport, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
        [
            space.id,
            space.name,
            space.icon ?? null,
            space.color ?? null,
            space.isDefault ? 1 : 0,
            JSON.stringify(space.canvasViewport),
            space.createdAt,
            space.updatedAt,
        ]
    );
}

// Guards loadSpaces() against being kicked off twice because of React's StrictMode
let loadPromise: Promise<void> | null = null;

// --------------------------
// Store types
// --------------------------

interface SpaceStore {
    // --- State ---

    spaces: Space[];

    activeSpaceId: string;

    // --- Actions ---

    // Load every Space from the database. If none, create and persist
    // the default "Personal" Space.
    loadSpaces: () => Promise<void>;

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

    loadSpaces: () => {
        if (loadPromise) return loadPromise;

        loadPromise = (async () => {
            const rows = await dbSelect<SpaceRow>("SELECT * FROM spaces");

            if (rows.length === 0) {
                const defaultSpace: Space = {
                    id: generateId(),
                    name: "Personal",
                    isDefault: true,
                    canvasViewport: DEFAULT_VIEWPORT,
                    createdAt: now(),
                    updatedAt: now(),
                };

                await insertSpaceSql(defaultSpace);
                set({ spaces: [defaultSpace], activeSpaceId: defaultSpace.id });
                return;
            }

            const spaces = rows.map(rowToSpace);
            const active = spaces.find((space) => space.isDefault) ?? spaces[0];

            set({ spaces, activeSpaceId: active.id });
        })();

        return loadPromise;
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
        insertSpaceSql(newSpace).catch((e) => console.error("Couldn't persist new space: ", e));

        return newSpace;
    },

    renameSpace: (id, name) => {
        const updatedAt = now();

        set((state) => ({
            spaces: state.spaces.map((space) =>
                space.id === id
                    ? { ...space, name, updatedAt }
                    : space
            )
        }));

        dbExecute(
            "UPDATE spaces SET name = ?1, updated_at = ?2 WHERE id = ?3",
            [name, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Space rename: ", e));
    },

    updateSpaceIcon: (id, icon) => {
        const updatedAt = now();

        set((state) => ({
            spaces: state.spaces.map((space) =>
                space.id === id
                    ? { ...space, icon, updatedAt }
                    : space
            )
        }));

        dbExecute(
            "UPDATE spaces SET icon = ?1, update_at = ?2 WHERE id = ?3",
            [icon, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Space Icon: ", e));
    },

    updateSpaceColor: (id, color) => {
        const updatedAt = now();

        set((state) => ({
            spaces: state.spaces.map((space) =>
                space.id === id
                    ? { ...space, color, updatedAt }
                    : space
            )
        }));

        dbExecute(
            "UPDATE spaces SET color = ?1, update_at = ?2 WHERE id = ?3",
            [color, updatedAt, id]
        ).catch((e) => console.error("Couldn't persist Space Color: ", e));
    },

    updateSpaceViewport: (id, viewport) => {
        set((state) => ({
            spaces: state.spaces.map((space) => 
                space.id === id
                    ? { ...space, canvasViewport: viewport }
                    : space
            )
        }));

        dbExecute(
            "UPDATE spaces SET canvas_viewport = ?1 WHERE id = ?2",
            [JSON.stringify(viewport), id]
        ).catch((e) => console.error("Couldn't persist Space Viewport: ", e));
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

        dbExecute("DELETE FROM spaces WHERE id = ?1", [id])
            .catch((e) => console.error("Couldn't persist Space deletion: ", e));
    },

    getActiveSpace: () => {
        const { spaces, activeSpaceId } = get();
        const space = spaces.find((space) => space.id === activeSpaceId);
        
        if (!space) throw new Error(`Space ${activeSpaceId} not found`);
        return space;
    },
}));
