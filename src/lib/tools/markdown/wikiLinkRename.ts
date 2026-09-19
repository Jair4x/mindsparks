//
// When renaming a file or folder, recalculate the wikilinks throughout
//  the WHOLE vault that referenced it or something inside it.
//
// So rename-refactor, basically.
//

import { dirname, join } from "@tauri-apps/api/path";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { toRelativePath } from "./relativePath";

const WIKILINK_PATTERN = /\[\[([^\]|]+)(\|[^\]]*)?\]\]/g; // [[file]] / [[folder/file]]
const normalize = (p: string) => p.replace(/\\/g, "/");

async function rewriteWikiLinksInContent(
    content: string,
    fileDir: string,
    oldPath: string,
    newPath: string,
): Promise<{ content: string; count: number }> {
    const matches = [...content.matchAll(WIKILINK_PATTERN)];
    if (matches.length === 0) return { content, count: 0 };

    let count       = 0;
    let result      = "";
    let lastIndex   = 0;
    
    for (const match of matches) {
        const [full, target, labelPart = ""] = match;
        const matchStart = match.index!;

        const withExt               = target.endsWith(".md") ? target : `${target}.md`;
        const absoluteTarget        = await join(fileDir, withExt);
        const absoluteTargetNorm    = normalize(absoluteTarget);
        const oldPathNorm           = normalize(oldPath);
        
        let newAbsolute: string | null = null;

        if (absoluteTargetNorm === oldPathNorm) {
            newAbsolute = newPath;
        } else if (absoluteTargetNorm.startsWith(oldPathNorm + "/")) {
            newAbsolute = newPath + absoluteTarget.slice(oldPath.length);
        }

        result += content.slice(lastIndex, matchStart);

        if (newAbsolute) {
            const newRelative = toRelativePath(fileDir, newAbsolute).replace(/\.md$/, "");
            result += `[[${newRelative}${labelPart}]]`;
            count++;
        } else {
            result += full;
        }

        lastIndex = matchStart + full.length;
    }

    result += content.slice(lastIndex);
    return { content: result, count };
}

export interface WikiLinkRenameChange {
    path:       string;
    newContent: string;
    count:      number;
}

export async function computeWikiLinkRename(
    filePaths: string[],
    oldPath: string,
    newPath: string,
): Promise<WikiLinkRenameChange[]> {
    const changes: WikiLinkRenameChange[] = [];

    for (const path of filePaths) {
        if (normalize(path) === normalize(oldPath)) continue; // The file we're renaming, so it ain't there anymore

        const content = await readTextFile(path).catch(() => null);
        if (content === null) continue;

        const fileDir = await dirname(path);
        const { content: newContent, count } = await rewriteWikiLinksInContent(content, fileDir, oldPath, newPath);

        if (count > 0) changes.push({ path, newContent, count });
    }

    return changes;
}

export async function applyWikiLinkRenameChanges(changes: WikiLinkRenameChange[]): Promise<void> {
    for (const change of changes) {
        await writeTextFile(change.path, change.newContent);
    }
}
