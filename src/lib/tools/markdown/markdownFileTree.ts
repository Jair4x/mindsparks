import { readDir } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { toRelativePath } from "./relativePath";

export interface MarkdownFileNode {
    name: string;
    path: string;
    kind: "file" | "folder";
    isMarkdown?: boolean; // only needed when kind === "file"
    children?: MarkdownFileNode[];
}

// since readDir is only recursive for a single level, make recursion by hand based on the TauriV2 docs
// https://v2.tauri.app/reference/javascript/fs/#readdir
export async function buildFileTree(rootPath: string): Promise<MarkdownFileNode[]> {
    const entries = await readDir(rootPath);

    const nodes = await Promise.all(
        entries.map(async (entry): Promise<MarkdownFileNode> => {
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
                isMarkdown: entry.name.endsWith(".md"),
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

export function remapPath(path: string, oldPath: string, newPath: string): string {
    if (path === oldPath) return newPath;

    // folder
    if (path.startsWith(oldPath) && (path[oldPath.length] === "\\" || path[oldPath.length] === "/")) {
        return newPath + path.slice(oldPath.length);
    }

    return path;
}

export function flattenFiles(nodes: MarkdownFileNode[]): { path: string; name: string; }[] {
    return nodes.flatMap((node) => {
        if (node.kind === "file" && node.isMarkdown) {
            return [{ path: node.path, name: displayName(node.name) }];
        }

        if (node.kind === "folder" && node.children) {
            return flattenFiles(node.children);
        }

        return [];
    });
}

export async function getAncestorFolderPaths(rootPath: string, targetPath: string): Promise<string[]> {
    const relative = toRelativePath(rootPath, targetPath); // e.g. "folder1/folder2/notes.md"
    const segments = relative.split("/").slice(0, -1); // ["folder1", "folder2"]

    const ancestors: string[] = [];
    let current = rootPath;

    for (const segment of segments) {
        current = await join(current, segment);
        ancestors.push(current);
    }

    return ancestors;
}
