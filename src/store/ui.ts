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
    MIN_ZOOM as MIN_ZOOM,
    MAX_ZOOM as MAX_ZOOM,
    DEFAULT_ZOOM as DEFAULT_ZOOM
} from "../lib/constants";

// --------------------------
// Auxiliary types
// --------------------------

// Existent modals in the MVP.
// More will be added as the project evolves.
export type ModalType =
    | "spark-detail"        // Modal for the details of a spark
    | "spark-to-flame"      // Spark to flame conversion modal
    | "manage-tools"        // spark-to-flame, but inside a flame to manage tools
    | "category-form"       // Modal to create or edit a category
    | null;                 // No modal open

// Type of nodes that can be selected in the canvas
export type SelectedNodeType = "spark" | "flame";

// For multiple selection
export type SelectedNode = {
    id: string;
    type: SelectedNodeType;
};

// Type of selections the user can do to nodes
export type Selection =
    | { type: "single"; id: string; nodeType: SelectedNodeType }
    | { type: "multi"; nodes: SelectedNode[] }
    | { type: "none" };

// For drag selection
export type SelectionBox = {
    start: Position;
    current: Position;
};

export type ContextMenuType = {
    position: Position;
    nodeId: string;
    nodeType: "spark" | "flame" | null;
};

// --------------------------
// Store Types
// --------------------------

interface UIStore {
    // --- Modal state ---

    activeModal: ModalType;

    // ID of the spark or flame that's being viewed or edited
    // in the active modal. null if no modal is open.
    activeModalNodeId: string | null;

    // --- Menu state ---

    contextMenu: ContextMenuType | null;

    // --- Canvas state --

    // Current zoom level in the canvas. 1 = 100%, 0.5 = 50%, 2 = 200%
    // Constants are up
    zoom: number;

    canvasViewport: { x: number; y: number; zoom: number };

    selection: Selection;

    selectionBox: SelectionBox | null;

    isSelecting: boolean;

    // Used to show the edges of the lineage graph.
    hoveredNodeId: string | null;

    activeView: "canvas" | "flame";

    activeFlameId: string | null;

    navigationStack: string[];  // IDs of flames in the navigation stack

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

    openModal: (modal: ModalType, nodeId?: string | null) => void;
    closeModal: () => void;

    // --- Actions: menu ---

    openContextMenu: (menu: ContextMenuType) => void;
    closeContextMenu: () => void;

    // --- Actions: canvas ---

    setCanvasViewport: (viewport: { x: number; y: number; zoom: number }) => void;
    setZoom: (zoom: number) => void;
    selectNode: (id: string, nodeType: SelectedNodeType) => void;
    toggleNodeSelection: (node: SelectedNode) => void;
    replaceSelection: (selection: Selection) => void;
    startSelectionBox: (start: Position) => void;
    updateSelectionBox: (current: Position) => void;
    endSelectionBox: () => void;
    clearSelection: () => void;
    setHoveredNode: (id: string | null) => void;

    openFlame: (flameId: string) => void;
    goBack: () => void;

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
    contextMenu: null,
    zoom: DEFAULT_ZOOM,
    canvasViewport: { x: 0, y: 0, zoom: 1 },
    selection: { type: "none" },
    selectionBox: null,
    isSelecting: false,
    hoveredNodeId: null,
    activeView: "canvas",
    activeFlameId: null,
    navigationStack: [],
    isPanelCollapsed: false,
    isZenModeActive: false,

    // --- Modals ---

    openModal: (modal, nodeId = null) => {
        set({ activeModal: modal, activeModalNodeId: nodeId });
    },

    closeModal: () => {
        set({ activeModal: null, activeModalNodeId: null });
    },

    // --- Menu ---
    openContextMenu: (menu) => {
        set({ contextMenu: menu });
    },

    closeContextMenu: () => {
        set({ contextMenu: null });
    },

    // --- Canvas ---

    setCanvasViewport: (viewport) => {
        set({ canvasViewport: viewport });
    },

    setZoom: (zoom) => {
        // Apply the limits so the zoom doesn't get out the allowed range.
        const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
        set({ zoom: clampedZoom });
    },

    selectNode: (id, nodeType) => {
        set({ selection: { type: "single", id, nodeType } });
    },

    replaceSelection: (selection) => {
        set({ selection });
    },

    toggleNodeSelection: (node) => {
        const { selection } = get();

        let currentNodes: SelectedNode[] = [];

        if (selection.type === "single") {
            currentNodes = [{
                id: selection.id,
                type: selection.nodeType,
            }];
        }

        if (selection.type === "multi") {
            currentNodes = selection.nodes;
        }

        const alreadySelected = currentNodes.some((n) => n.id === node.id);

        const nextNodes = alreadySelected
            ? currentNodes.filter((n) => n.id !== node.id)
            : [...currentNodes, node];

        if (nextNodes.length === 0) {
            set({ selection: { type: "none" } });
            return;
        }

        if (nextNodes.length === 1) {
            set({
                selection: {
                    type: "single",
                    id: nextNodes[0].id,
                    nodeType: nextNodes[0].type,
                }
            });
            return;
        }

        set({
            selection: {
                type: "multi",
                nodes: nextNodes,
            },
        });
    },

    startSelectionBox: (start) => {
        set({
            isSelecting: true,
            selectionBox: {
                start,
                current: start,
            }
        });
    },

    updateSelectionBox: (current) => {
        set((state) => ({
            selectionBox: state.selectionBox
                ? { ...state.selectionBox, current }
                : null
        }));
    },

    endSelectionBox: () => {
        set({
            isSelecting: false,
            selectionBox: null,
        });
    },

    clearSelection: () => {
        set({ selection: { type: "none" } });
    },

    setHoveredNode: (id) => {
        set({ hoveredNodeId: id });
    },

    openFlame: (flameId) => {
        set((state) => ({
            activeView: "flame",
            activeFlameId: flameId,
            navigationStack: state.activeFlameId
                ? [...state.navigationStack, state.activeFlameId]
                : state.navigationStack,
        }));
    },

    goBack: () => {
        set((state) => {
            const stack = [...state.navigationStack];
            const previousFlameId = stack.pop();

            return {
                activeView: previousFlameId ? "flame" : "canvas",
                activeFlameId: previousFlameId ?? null,
                navigationStack: stack,
            };
        });
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