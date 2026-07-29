//
// Compared to the other stores, this one doesn't manage data from the domain.
// Instead, it manages the visual state of the app: what's open, what's being selected,
// how is the view set up right now.
//
// Centralizing this here evades having to pass props between components that don't have a direct relationship.
//  For example, the buttons to collapse the side panel and the canvas need to know if the panel is open or not,
//  but they don't have a direct parent/child relationship.
//

import { create } from "zustand";
import type { Position } from "../types";
import {
    CANVAS_MIN_ZOOM     as MIN_ZOOM,
    CANVAS_MAX_ZOOM     as MAX_ZOOM,
    CANVAS_DEFAULT_ZOOM as DEFAULT_ZOOM
} from "../lib/constants";

// --------------------------
// Auxiliary types
// --------------------------

// Existent modals in the MVP.
// More will be added as the project evolves.
export type ModalType =
    | "spark-detail"        // Modal for the details of a spark
    | "spark-to-flame"      // Spark to flame conversion modal
    | "category-form"       // Modal to create or edit a category
    | null;                 // No modal open

// Type of nodes that can be selected in the canvas
export type SelectedNodeType = "spark" | "flame";

// For multiple selection
export type SelectedNode = {
    id:     string;
    type:   SelectedNodeType;
};

// Type of selections the user can do to nodes
export type Selection =
    | { type: "single"; id: string; nodeType: SelectedNodeType }
    | { type: "multi"; nodes: SelectedNode[] }
    | { type: "none" };

// --------------------------
// Store Types
// --------------------------

interface UIStore {
    // --- Modal state ---

    activeModal: ModalType;

    // ID of the spark or flame that's being viewed or edited
    // in the active modal. null if no modal is open.
    activeModalNodeId: string | null;

    // --- Canvas state --

    // Current zoom level in the canvas. 1 = 100%, 0.5 = 50%, 2 = 200%
    // Constants are up
    zoom: number;

    selection: Selection;

    // Used to show the edges of the lineage graph.
    hoveredNodeId: string | null;

    // --- Side panel state ---

    isPanelCollapsed: boolean;

    // --- Zen mode state ---

    isZenModeActive: boolean;

    // --- Spark input state ---
    sparkInputPosition: { screen: Position; canvas: Position; } | null;
    openSparkInput: (position: {
        screen: Position;
        canvas: Position;
    }) => void;
    closeSparkInput: () => void;

    // --- Actions: modals ---

    openModal: (modal: ModalType, nodeId?: string) => void;
    closeModal: () => void;

    // --- Actions: canvas ---

    setZoom: (zoom: number) => void;
    resetZoom: () => void;
    selectNode: (id: string, nodeType: SelectedNodeType) => void;
    toggleMultiSelectNode: (node: SelectedNode) => void;
    clearSelection: () => void;
    setHoveredNode: (id: string | null) => void;

    // --- Actions: side panel & zen mode

    togglePanel: () => void;
    toggleZenMode: () => void;
}


// --------------------------
// Store
// --------------------------

export const useUIStore = create<UIStore>((set, get) => ({
    activeModal: null,
    activeModalNodeId: null,
    sparkInputPosition: null,
    zoom: DEFAULT_ZOOM,
    selection: { type: "none" },
    hoveredNodeId: null,
    isPanelCollapsed: false,
    isZenModeActive: false,

    // --- Modals ---

    openModal: (modal, nodeId = null) => {
        set({ activeModal: modal, activeModalNodeId: nodeId });
    },

    closeModal: () => {
        set({ activeModal: null, activeModalNodeId: null });
    },

    // --- Canvas ---

    setZoom: (zoom) => {
        // Apply the limits so the zoom doesn't get out the allowed range.
        const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
        set({ zoom: clampedZoom });
    },

    resetZoom:() => {
        set({ zoom: DEFAULT_ZOOM });
    },

    selectNode: (id, nodeType) => {
        set({ selection: { type: "single", id, nodeType } });
    },

    toggleMultiSelectNode: (node) => {
        const { selection } = get();

        const currentNodes =
            selection.type === "multi" ? selection.nodes : [];

        const alreadySelected = currentNodes.some((n) => n.id === node.id);

        // Get rid or add node
        set({
            selection: {
                type: "multi",
                nodes: alreadySelected
                    ? currentNodes.filter((n) => n.id !== node.id)
                    : [...currentNodes, node],
            },
        });
    },

    clearSelection: () => {
        set({ selection: { type: "none" } });
    },

    setHoveredNode: (id) => {
        set({ hoveredNodeId: id });
    },

    // --- Spark creation ---

    openSparkInput: (position) => {
        set({ sparkInputPosition: position });
    },

    closeSparkInput: () => {
        set({ sparkInputPosition: null });
    },

    // --- Side panel & Zen mode ---

    togglePanel: () => {
        set((state) => ({ isPanelCollapsed: !state.isPanelCollapsed }));
    },

    toggleZenMode: () => {
        // Zen mode automatically collapses the side panel.
        // When deactivated, return the side panel to its original state.
        set((state) => ({
            isZenModeActive: !state.isZenModeActive,
            isPanelCollapsed: !state.isZenModeActive ? true : state.isPanelCollapsed,
        }));
    },
}));