// --------------------------
// Auxiliary functions
//  Set of helper functions to comply with
// --------------------------

// Generate a random ID
export function generateId(): string {
    return crypto.randomUUID();
}

// Returns the current time in ISO 8601 format.
//  The reason we use this is related to SQLite, more info in src/types/index.ts
export function now(): string {
    return new Date().toISOString();
}