//
// Shared contract between the main window and the quick capture window.
//
// Since they're two different JS runtimes, they have two completely different Zustand stores.
//  So this is the only way in which data is passed: events pushed through Tauri's IPC (Inter-Process Communication).
//

import type { Space } from "../types";

export const SPACES_UPDATED_EVENT       = "quick-capture:spaces-updated";
export const CREATE_SPARK_EVENT         = "quick-capture:create-spark";
export const QUICK_CAPTURE_READY_EVENT  = "quick-capture:ready";

export interface SpacesUpdatedPayload {
    spaces: Space[];
}

export interface CreateSparkPayload {
    text: string;
    spaceId: string;
}
