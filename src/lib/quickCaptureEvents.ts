//
// Shared contract between the main window and the quick capture window.
//
// Since they're two different JS runtimes, they have two completely different Zustand stores.
//  So this is the only way in which data is passed: events pushed through Tauri's IPC (Inter-Process Communication).
//

import type { Space, Position } from "../types";
import { emitTo } from "@tauri-apps/api/event";

export const SPACES_UPDATED_EVENT       = "quick-capture:spaces-updated";
export const CREATE_SPARK_EVENT         = "quick-capture:create-spark";
export const QUICK_CAPTURE_READY_EVENT  = "quick-capture:ready";
export const QUICK_CAPTURE_OPEN_EVENT   = "quick-capture:open";

export type QuickCaptureMode = "global" | "inline";

export interface QuickCaptureOpenPayload {
    mode:           QuickCaptureMode;
    spaceId?:       string;
    sparkPosition?: Position;
    parentId?:      string;
}

export interface SpacesUpdatedPayload {
    spaces:         Space[];
}

export interface CreateSparkPayload {
    text:           string;
    spaceId:        string;
    position:       Position;
    parentId?:      string;
}

export function openQuickCapture(payload: QuickCaptureOpenPayload) {
    return emitTo("quick-capture", QUICK_CAPTURE_OPEN_EVENT, payload);
}
