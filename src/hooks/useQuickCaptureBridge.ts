//
// Connects the main window with the one for quick-capture and:
//  - Pushes the list of Spaces each time it changes (since quick-capture can't read it directly because it's a separate runtime).
//  - Listens to spark creation requests from quick-capture and executes them here, since the main window is the only real owner of the stores.
//
// Mounted a single time from App.tsx, and in the main window.
//

import { useEffect } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { useSpaceStore, useConnectionStore, useSparkStore, useUIStore } from "../store";
import {
    SPACES_UPDATED_EVENT,
    CREATE_SPARK_EVENT,
    QUICK_CAPTURE_READY_EVENT,
    type CreateSparkPayload,
} from "../lib/quickCaptureEvents";

export function useQuickCaptureBridge() {
    const spaces = useSpaceStore((s) => s.spaces);

    useEffect(() => {
        emitTo("quick-capture", SPACES_UPDATED_EVENT, { spaces }).catch(() => {
            // The window could not be ready yet (app just started)
            // No worries though, it'll probably receive the next call.
        });
    }, [spaces]);

    useEffect(() => {
        const unlisten = listen(QUICK_CAPTURE_READY_EVENT, () => {
            emitTo("quick-capture", SPACES_UPDATED_EVENT, {
                spaces: useSpaceStore.getState().spaces,
            }).catch(() => { });
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    useEffect(() => {
        const unlisten = listen<CreateSparkPayload>(CREATE_SPARK_EVENT, (event) => {
            const { text, position, spaceId, parentId } = event.payload;

            const newSpark = useSparkStore.getState().createSpark({
                text,
                position,
                spaceId,
                parentId,
            });

            if (parentId) {
                useConnectionStore.getState().createLineageConnection({
                    sourceId: parentId,
                    targetId: newSpark.id,
                    spaceId,
                });
            }

            useUIStore.getState().requestRepulsion([newSpark.id]);
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);
}