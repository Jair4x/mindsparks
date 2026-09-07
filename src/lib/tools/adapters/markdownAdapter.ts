import { invoke } from "@tauri-apps/api/core";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { ToolContentAdapter, ToolContext } from "../types";

const MARKDOWN_SUBFOLDER = "Markdown";

export const markdownAdapter: ToolContentAdapter<string> = {
    async resolveRoot(context: ToolContext): Promise<string> {
        const flameFolder = await invoke<string>("resolve_flame_folder", {
            spaceId: context.spaceId,
            spaceName: context.spaceName,
            flameId: context.flameId,
            flameName: context.flameName,
        });

        const markdownFolder = await join(flameFolder, MARKDOWN_SUBFOLDER);

        if (!(await exists(markdownFolder))) {
            await mkdir(markdownFolder, { recursive: true });
        }

        return markdownFolder;
    },

    async delete(): Promise<void> {
        // no-op on purpose for now, I have to get this part planned out first.
    },
}
