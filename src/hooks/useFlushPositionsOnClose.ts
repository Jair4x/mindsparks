//
// Self explanatory name, when closing the app, flush every position write to DB when closing the app.
//

import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { flushPositionWrites } from "../lib/canvasPositionSync";

export function useFlushPositionsOnClose() {
    useEffect(() => {
        const unlistenPromise = getCurrentWindow().onCloseRequested(async (e) => {
            e.preventDefault();
            await flushPositionWrites();
            await getCurrentWindow().destroy();
        });

        return () => {
            unlistenPromise.then((unlisten) => unlisten());
        }
    }, []);
}
