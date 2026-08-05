//
// A connection represents an edge in the visual graph of the canvas.
// There's two types:
//  - "lineage": parental connection. Created automatically when a spark/flame generates a child.
//  - "related": manual connection. The user creates it to indicate that two ideas are conceptually linked, without
//               hierarchy between them.
//
// Both types are drawn differently in the canvas:
//  lineage as a solid line, related as a dotted line.
//

import { create } from "zustand";
import { Connection, ConnectionType } from "../types";
import { generateId, now } from "../lib/utils";

// --------------------------
// Store types
// --------------------------

interface ConnectionStore {
    // --- State ---

    connections: Connection[];

    // --- Actions ---

    // Called automatically when:
    // - A spark/flame generates a child spark.
    // - A spark converts into a flame (reconnects the original spark with the flame, since it's no longer a spark)
    createLineageConnection: (params: {
        sourceId:   string;
        targetId:   string;
        spaceId:    string;
    }) => Connection;

    // Called when the user makes a manual connection between two nodes
    createRelatedConnection: (params: {
        sourceId:   string;
        targetId:   string;
        spaceId:    string;
    }) => Connection;

    // Automatically gets executed if the source spark or flame is archived.
    // The "related" type connections can be deleted manually by the user.
    deleteConnection: (id: string) => void;

    // Used when deleting a spark or flame to not leave orphan connections.
    deleteConnectionsByNode: (nodeId: string) => void;

    getConnectionsBySpace: (spaceId: string) => Connection[];

    // Used when hovering over a card to know which edges to draw
    getConnectionsByNode: (nodeId: string) => Connection[];
}

// --------------------------
// Internal Helper
// --------------------------

// Creates a connection with the base fields complete.
// Private because the public logic is in createLineageConnection and createRelatedConnection,
// which are the correct entry points.

function buildConnection(
    sourceId:   string,
    targetId:   string,
    type:       ConnectionType,
    spaceId:    string
): Connection {
    return {
        id: generateId(),
        sourceId,
        targetId,
        type,
        spaceId,
        createdAt: now(),
    };
}

// --------------------------
// Store
// --------------------------

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
    connections: [],

    createLineageConnection: ({ sourceId, targetId, spaceId }) => {
        const connection = buildConnection(sourceId, targetId, "lineage", spaceId);
        set((state) => ({ connections: [...state.connections, connection] }));
        return connection;
    },

    createRelatedConnection: ({ sourceId, targetId, spaceId }) => {
        const connection = buildConnection(sourceId, targetId, "related", spaceId);
        set((state) => ({ connections: [...state.connections, connection] }));
        return connection;
    },

    deleteConnection: (id) => {
        set((state) => ({
            connections: state.connections.filter((connection) => connection.id !== id),
        }));
    },

    deleteConnectionsByNode: (nodeId) => {
        set((state) => ({
            connections: state.connections.filter(
                (connection) => connection.sourceId !== nodeId && connection.targetId !== nodeId),
        }));
    },

    getConnectionsBySpace: (spaceId) => {
        return get().connections.filter(
            (connection) => connection.spaceId === spaceId
        );
    },

    getConnectionsByNode: (nodeId) => {
        return get().connections.filter(
            (connection) => connection.sourceId === nodeId || connection.targetId === nodeId
        );
    },
}));
