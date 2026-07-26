// --------------------------
// Auxiliary functions
//  Set of helper functions to comply with "DRY" (Don't Repeat Yourself)
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

// Formats an ISO date into a legible format.
// "2d ago", "3h ago", "1w ago", etc.
export function formatRelativeDate(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return `${weeks}w ago`;
}

// Safe zones
// For double clicking, to prevent the user to open the input in a weird place.
export function isSafeZone(x: number, y: number): boolean {
    return x > 70 && y > 60 && !(x > window.innerWidth - 120 && y > window.innerHeight - 60);
}