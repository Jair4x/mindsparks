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
import { dbSelect, dbExecute } from "../lib/db";

// --------------------------
// DB stuff
// --------------------------

// Shape of a row as it comes back from the connections table
interface ConnectionRow {
    id:         string;
    source_id:  string;
    target_id:  string;
    type:       string;
    space_id:   string;
    created_at: string;
}

function rowToConnection(row: ConnectionRow): Connection {
    return {
        id: row.id,
        sourceId: row.source_id,
        targetId: row.target_id,
        type: row.type as ConnectionType,
        spaceId: row.space_id,
        createdAt: row.created_at,
    };
}

function insertConnectionSql(conn: Connection) {
    return dbExecute(
        `INSERT INTO connections (id, source_id, target_id, type, space_id, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        [
            conn.id,
            conn.sourceId,
            conn.targetId,
            conn.type,
            conn.spaceId,
            conn.createdAt
        ]
    );
}

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

    loadConnections: () => Promise<void>;

    // Automatically gets executed if the source spark or flame is archived.
    // The "related" type connections can be deleted manually by the user.
    deleteConnection: (id: string) => void;

    // Used when deleting (not archiving) a spark or flame to not leave orphan connections.
    deleteConnectionsByNode: (nodeId: string) => void;

    // Used for cascade deletion
    deleteConnectionsBySpace: (spaceId: string) => void;

    getConnectionsBySpace: (spaceId: string) => Connection[];

    // Used when hovering over a card to know which edges to draw
    getConnectionsByNode: (nodeId: string) => Connection[];

    // Re-point endpoints instead of leaving them stale
    repointNode: (oldId: string, newId: string) => void;
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

        insertConnectionSql(connection).catch((e) => console.error("Couldn't persist new Lineage Connection: ", e));

        return connection;
    },

    createRelatedConnection: ({ sourceId, targetId, spaceId }) => {
        const connection = buildConnection(sourceId, targetId, "related", spaceId);
        set((state) => ({ connections: [...state.connections, connection] }));

        insertConnectionSql(connection).catch((e) => console.error("Couldn't persist new Related Connection: ", e));

        return connection;
    },

    loadConnections: async () => {
        const rows = await dbSelect<ConnectionRow>("SELECT * FROM connections");
        set({ connections: rows.map(rowToConnection) });
    },

    deleteConnection: (id) => {
        set((state) => ({
            connections: state.connections.filter((connection) => connection.id !== id),
        }));

        dbExecute(
            "DELETE FROM connections WHERE id = ?1",
            [id]
        ).catch((e) => console.error("Couldn't persist Connection deletion: ", e));
    },

    deleteConnectionsByNode: (nodeId) => {
        set((state) => ({
            connections: state.connections.filter(
                (connection) => connection.sourceId !== nodeId && connection.targetId !== nodeId),
        }));

        dbExecute(
            "DELETE FROM connections WHERE source_id = ?1 OR target_id = ?1",
            [nodeId]
        ).catch((e) => console.error("Couldn't persist Connection cleanup: ", e));
    },

    deleteConnectionsBySpace: (spaceId) => {
        set((state) => ({
            connections: state.connections.filter((connection) => connection.spaceId !== spaceId)
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

    repointNode: (oldId, newId) => {
        set((state) => ({
            connections: state.connections.map((c) => ({
                ...c,
                sourceId: c.sourceId === oldId ? newId : c.sourceId,
                targetId: c.targetId === oldId ? newId : c.targetId,
            })),
        }));

        dbExecute(
            `UPDATE connections
            SET source_id = CASE WHEN source_id = ?1 THEN ?2 ELSE source_id END,
            target_id = CASE WHEN target_id = ?1 THEN ?2 ELSE target_id END
            WHERE source_id = ?1 OR target_id = ?1`,
            [oldId, newId]
        ).catch((e) => console.error("Couldn't persist Connection repoint: ", e));
    },
}));
