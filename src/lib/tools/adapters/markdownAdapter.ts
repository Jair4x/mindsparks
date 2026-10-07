import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import type { ToolContentAdapter, ToolContext } from "../types";
import { resolveFlameFolderPath } from "../../flamePaths";

const MARKDOWN_SUBFOLDER = "Markdown";

export const markdownAdapter: ToolContentAdapter<string> = {
    async resolveRoot(context: ToolContext): Promise<string> {
        const flameFolder = await resolveFlameFolderPath(
            context.spaceFolderName,
            context.flameFolderName,
            context.flameIsArchived
        );

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
