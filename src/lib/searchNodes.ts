//
// Pure search logic for the Search modal.
//  Data goes in → Matches go out.
//
// Separated from the modal so the matching can be reasoned about on its own.
//

import type { Spark, Flame, Space } from "../types";

export type SearchableNode =
    | ({ kind: "spark" } & Spark)
    | ({ kind: "flame" } & Flame);

export interface SearchResult {
    node:           SearchableNode;
    matchStart:     number;         // index into node.name, -1 if only description matches
    matchLength:    number;
    space:          Space;          // resolved Space, for cross-Space results' icon/name
}

export interface SearchResults {
    sameSpace:      SearchResult[];
    otherSpaces:    SearchResult[];
}

export function searchNodes(
    query:          string,
    sparks:         Spark[],
    flames:         Flame[],
    spaces:         Space[],
    activeSpaceId:  string
): SearchResults {
    const trimmed = query.trim().toLowerCase();

    if (trimmed.length === 0) {
        return { sameSpace: [], otherSpaces: [] };
    }

    const spaceById = new Map(spaces.map((space) => [space.id, space]));

    // I don't want the user to search archived since archived nodes will have their own side on the app.
    const candidates: SearchableNode[] = [
        ...sparks.filter((s) => !s.isArchived).map((s) => ({ kind: "spark" as const, ...s })),
        ...flames.filter((f) => !f.isArchived).map((f) => ({ kind: "flame" as const, ...f})),
    ];

    const sameSpace: SearchResult[] = [];
    const otherSpaces: SearchResult[] = [];

    for (const node of candidates) {
        const nameIndex = node.name.toLowerCase().indexOf(trimmed);

        // subject to change because I'll most probably add description for Flames later too
        const descriptionMatches = "description" in node
            ? (node.description ?? "").toLowerCase().includes(trimmed)
            : false;

        if (nameIndex === -1 && !descriptionMatches) continue;

        const space = spaceById.get(node.spaceId);
        if (!space) continue; // dangling spaceId shouldn't happen, not worth crashing over

        const result: SearchResult = {
            node,
            matchStart: nameIndex,
            matchLength: nameIndex === -1 ? 0 : trimmed.length,
            space,
        };

        (node.spaceId === activeSpaceId ? sameSpace : otherSpaces).push(result); // looks cursed, but simple
    }

    // Name matches read before description-only matches, within each column.
    const byMatchKind = (a: SearchResult, b: SearchResult) =>
        (a.matchStart === -1 ? 1 : 0) - (b.matchStart === -1 ? 1 : 0);

    sameSpace.sort(byMatchKind);
    otherSpaces.sort(byMatchKind);

    return { sameSpace, otherSpaces };
}
