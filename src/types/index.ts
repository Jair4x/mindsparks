//
// MindSparks' base types.
//
//  Timestamps will only be in ISO 8601 format, as SQLite saves dates as text,
//   it's more simple to save them in this format throughout the whole project than converting between Date and string all the time.
//

// --------------------------
// Position
//  Coordinates of a card in the canvas. Separated as its own type
//  because both Sparks and Flames use it, so we don't repeat the definition
// --------------------------
export interface Position {
    x: number;
    y: number;
}

// --------------------------
// Category
//  Group of sparks and flames by theme. Has a color that's used as glow
//  in the cards inside the canvas. A spark/flame is able to not have a category.
// --------------------------
export interface Category {
    id:         string;
    name:       string;
    color:      string; // hex, ex. "#a855f7"
    spaceId:    string; // to which Space it belongs
    createdAt:  string;
}

// --------------------------
// Spark
//  The basic unit of this project. An idea in its raw state.
//  No tools, no structure, it only exists.
// --------------------------
export interface Spark {
    id:             string;
    text:           string;     // Title of the idea
    description?:   string;     // Short description of the idea (150 chars max, optional)
    position:       Position;   // where is it in the canvas
    spaceId:        string;     // to which Space it belongs
    categoryId?:    string;     // optional: it might not have a category
    parentId?:      string;     // optional: if it's a child of another spark or flame
    isArchived:     boolean;
    createdAt:      string;
    updatedAt:      string;
}

// --------------------------
// FlameSchema
//  The tools preset that the user chooses when choosing to convert a spark into a flame.
//      "development" and "research" are the two predefined schemas.
//      "custom" is set when the user defines the tools manually (default value).
// --------------------------
export type FlameSchema = "development" | "research" | "custom";

// --------------------------
// FlameTool
//  The tools available in this MVP.
//      Later phases will add more options to this type.
// --------------------------
export type FlameTool = "markdown" | "kanban" | "checklist";

// --------------------------
// Flame
//  A spark that the user decided to develop as a project.
//      Has the same base properties as a Spark, plus the active tools
//      and the chosen schema.
// --------------------------
export interface Flame {
    id:             string;
    name:           string;         // inherits the original spark's text, editable
    sparkId:        string;         // pointer to the spark it came from
    position:       Position;       // where is it in the canvas
    spaceId:        string;
    categoryId?:    string;
    parentId?:      string;
    schema:         FlameSchema;
    tools:          FlameTool[];    // active tools in this flame
    isArchived:     boolean;
    isCompleted:    boolean;        // if the user marked it as finished
    createdAt:      string;
    updatedAt:      string;
}

// --------------------------
// ConnectionType
//  Connection type (duh) between two nodes in the canvas.
//      "lineage" is the parent/children relationship (drawed when converting a spark in a child).
//      "related" is a manual connection the user creates to indicate conceptual relation without hierarchy.
// --------------------------
export type ConnectionType = "lineage" | "related";

// --------------------------
// Connection
//  Represents the edge in the canvas' graph.
//      sourceId and targetId can be IDs of either sparks or flames.
// --------------------------
export interface Connection {
    id:         string;
    sourceId:   string;
    targetId:   string;
    type:       ConnectionType;
    spaceId:    string;
    createdAt:  string;
}

// --------------------------
// Space
//  A canvas with its own context. The personal Space is the default
//  and cannot be deleted. Additional Spaces can be private or shared (shared comes on Phase 3).
// --------------------------
export interface Space {
    id:         string;
    name:       string;
    icon?:      string;     // emoji or icon identifier
    color?:     string;     // identifier color, hex
    isDefault:  boolean;    // only true for the personal Space
    createdAt:  string;
    updatedAt:  string;
}
