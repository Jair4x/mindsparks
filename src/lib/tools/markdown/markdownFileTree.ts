import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";

export interface MarkdownFileNode {
    name: string;
    path: string;
    kind: "file" | "folder";
    children?: MarkdownFileNode[];
}

// since readDir is only recursive for a single level, make recursion by hand based on the TauriV2 docs
// https://v2.tauri.app/reference/javascript/fs/#readdir
export async function buildFileTree(rootPath: string): Promise<MarkdownFileNode[]> {
    const entries = await readDir(rootPath);

    const nodes = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory || entry.name.endsWith('.md'))
            .map(async (entry): Promise<MarkdownFileNode> => {
                const path = await join(rootPath, entry.name);

                if (entry.isDirectory) {
                    return {
                        name: entry.name,
                        path,
                        kind: "folder",
                        children: await buildFileTree(path),
                    };
                }

                return {
                    name: entry.name,
                    path,
                    kind: "file",
                };
            })
    );

    // folders first, files later, in alphabetical order
    return nodes.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;

        return a.name.localeCompare(b.name);
    });
}

// "untitled.md" if available, else "untitled 1.md", "untitled 2.md", and so on
export function generateUniqueName(
    baseName: string,
    extension: string,
    existingNames: Set<String>
): string {
    let candidate = `${baseName}${extension}`;
    let counter = 1;

    while (existingNames.has(candidate)) {
        candidate = `${baseName} ${counter}${extension}`;
        counter++;
    }

    return candidate;
}

export function displayName(name: string): string {
    return name.endsWith(".md") ? name.slice(0, -3) : name;
}

export function findFolderChildren(nodes: MarkdownFileNode[], targetPath: string): MarkdownFileNode[] | null {
    for (const node of nodes) {
        if (node.kind !== "folder") continue;
        if (node.path === targetPath) return node.children ?? [];

        const nested = findFolderChildren(node.children ?? [], targetPath);
        if (nested !== null) return nested;
    }

    return null;
}

export function getChildrenAt(
    nodes: MarkdownFileNode[],
    targetPath: string,
    rootPath: string
): MarkdownFileNode[] {
    if (targetPath === rootPath) return nodes;
    return findFolderChildren(nodes, targetPath) ?? [];
}
