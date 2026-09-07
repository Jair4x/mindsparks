import type { ToolContentAdapter } from "./types";
import { markdownAdapter } from "./adapters";

export const toolAdapters: Record<string, ToolContentAdapter<any>> = {
    markdown: markdownAdapter,
};
