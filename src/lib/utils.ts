// --------------------------
// Auxiliary functions
//  Set of helper functions to comply with "DRY" (Don't Repeat Yourself)
// --------------------------
import { useState, useEffect } from "react";
import type { Position } from "../types";
import { SAFE_ZONE_MARGIN, DEFAULT_CARD_HEIGHT, DEFAULT_CARD_WIDTH } from "./constants";

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
export function formatRelativeDate(isoDate: string, nowMs = Date.now()): string {
    const diff = nowMs - new Date(isoDate).getTime();

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
    const margin = SAFE_ZONE_MARGIN;

    return (
        x > margin &&                       // Left
        y > margin &&                       // Up
        x < window.innerWidth - margin &&   // Right
        y < window.innerHeight - margin     // Down
    );
}

// Function to force re-render
export function useNow(intervalMs = 20000) {
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNowMs(Date.now()), intervalMs);
        return () => clearInterval(interval);
    }, [intervalMs]);

    return nowMs;
}

// --------------------------
// centerNodeOnPoint
//
// Self explanatory, when creating a node, it appears on the center of the
//  cursor, not the upper left side as React Flow does by default.
//
// This would've been added later, but this is UX and it bothered me that
//  I didn't do this before.
// --------------------------
export function centerNodeOnPoint(point: Position): Position {
    return {
        x: point.x - DEFAULT_CARD_WIDTH / 2,
        y: point.y - DEFAULT_CARD_HEIGHT / 2,
    };
}