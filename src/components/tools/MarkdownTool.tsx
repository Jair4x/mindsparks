import { useEffect, useState } from "react";
import { writeTextFile, mkdir, stat, rename, remove } from "@tauri-apps/plugin-fs";
import { confirm } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";
import { useFlameStore, useSpaceStore } from "../../store";
import { useToolSession } from "../../hooks";
import { markdownAdapter } from "../../lib/tools/adapters";
import { buildFileTree, generateUniqueName, getChildrenAt, displayName, remapPath, type MarkdownFileNode } from "../../lib/tools/markdown/markdownFileTree";
import { FileTreeToolbar } from "./markdown/fileTreeToolbar";
import { FileTree } from "./markdown/FileTree";
import type { ToolInstance } from "../../types";

import { ArrowRightToLine as ExpandIcon } from "lucide-react";
import { MarkdownEditor } from "./markdown/MarkdownEditor";
import { FileTreeContextMenu } from "./markdown/FileTreeContextMenu";

interface MarkdownSession {
    openFilePath: string | null;
}

export function MarkdownTool({ flameId, instance }: { flameId: string; instance: ToolInstance }) {
    const flame = useFlameStore((s) => s.flames.find((f) => f.id == flameId));
    const space = useSpaceStore((s) => s.spaces.find((sp) => sp.id === flame?.spaceId));

    const [rootPath, setRootPath]                       = useState<string | null>(null);
    const [nodes, setNodes]                             = useState<MarkdownFileNode[]>([]);
    const [expandedPaths, setExpandedPaths]             = useState<Set<string>>(new Set());
    const [selectedFolderPath, setSelectedFolderPath]   = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed]   = useState(false);
    const [lastClickedPath, setLastClickedPath]         = useState<string | null>(null);
    const [session, setSession]                         = useToolSession<MarkdownSession>(instance.id, { openFilePath: null });
    const [renamingPath, setRenamingPath] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ node: MarkdownFileNode; x: number; y: number } | null>(null);

    // Create or resolve tool data
    useEffect(() => {
        if (!flame || !space) return;

        markdownAdapter
            .resolveRoot({
                instanceId: instance.id,
                flameId: flame.id,
                flameName: flame.name,
                spaceId: space.id,
                spaceName: space.name,
            })
            .then(async (root) => {
                setRootPath(root);
                setNodes(await buildFileTree(root));
            });
    }, [flame?.id, space?.id, instance.id]);

    async function refreshTree(root: string) {
        setNodes(await buildFileTree(root));
    }

    async function handleNewFile() {
        if (!rootPath) return;

        const targetDir     = selectedFolderPath ?? rootPath;
        const siblings      = getChildrenAt(nodes, targetDir, rootPath);
        const existingNames = new Set(siblings.filter((n) => n.kind === "file").map((n) => n.name));
        const name          = generateUniqueName("Untitled", ".md", existingNames);
        const path          = await join(targetDir, name);

        await writeTextFile(path, "");
        await refreshTree(rootPath);
        setSession({ openFilePath: path });

        if (targetDir !== rootPath) {
            setExpandedPaths((prev) => new Set(prev).add(targetDir));
        }
    }

    async function handleNewFolder() {
        if (!rootPath) return;

        const targetDir     = selectedFolderPath ?? rootPath;
        const siblings      = getChildrenAt(nodes, targetDir, rootPath);
        const existingNames = new Set(siblings.filter((n) => n.kind === "folder").map((n) => n.name));
        const name          = generateUniqueName("New Folder", "", existingNames);
        const path          = await join(targetDir, name);

        await mkdir(path);
        await refreshTree(rootPath);

        if (targetDir !== rootPath) {
            setExpandedPaths((prev) => new Set(prev).add(targetDir));
        }
    }

    async function handleConfirmRename(node: MarkdownFileNode, parentDir: string, newName: string) {
        setRenamingPath(null);

        const trimmed = newName.trim();
        if (!trimmed || !rootPath) return;

        let extension = node.kind === "file" && node.isMarkdown ? `.md` : "";
        const siblings = getChildrenAt(nodes, parentDir, rootPath);

        const existingNames = new Set(
            siblings
                .filter((sibling) => sibling.path !== node.path)
                .map((sibling) => sibling.name)
        );

        const match = trimmed.match(/^(.*?)(?:\s+(\d+))$/); // numbers at the end of the filename (i.e. things like "Untitled 1", "Notes 4")
        const baseName = match?.[1]?.trim() || trimmed;
        let count = match?.[2] ? Number(match[2]) : 0; // set as number at the end of filename, else just 0

        let finalName = `${baseName}${match?.[2] ? ` ${count}` : ""}${extension}`;

        while (existingNames.has(finalName)) {
            count++;
            finalName = `${baseName} ${count}${extension}`;
        }

        if (finalName === node.name) return;

        const newPath = await join(parentDir, finalName);
        await rename(node.path, newPath);

        setExpandedPaths((prev) => new Set([...prev].map((p) => remapPath(p, node.path, newPath))));
        setSelectedFolderPath((prev) => (prev ? remapPath(prev, node.path, newPath) : prev));
        setLastClickedPath((prev) => (prev ? remapPath(prev, node.path, newPath) : prev));
        setSession({
            openFilePath: session.openFilePath ? remapPath(session.openFilePath, node.path, newPath) : null,
        });

        await refreshTree(rootPath);
    }

    async function handleDelete(node: MarkdownFileNode) {
        if (!rootPath) return;

        const label = node.kind === "folder" ? "this folder (and everything inside)" : "this file";
        const confirmed = await confirm(`Delete ${label}? This can't be undone.`, {
            title: "Delete",
            kind: "warning",
        });
        if (!confirmed) return;

        await remove(node.path, { recursive: node.kind === "folder" });

        const wasOpenedFileAffected =
            session.openFilePath === node.path ||
            (session.openFilePath?.startsWith(node.path + "\\") ?? false) ||
            (session.openFilePath?.startsWith(node.path + "/") ?? false);

        if (wasOpenedFileAffected) setSession({ openFilePath: null });
        if (selectedFolderPath === node.path) setSelectedFolderPath(null);
        if (lastClickedPath === node.path) setLastClickedPath(null);

        await refreshTree(rootPath);
    }

    if (!rootPath) {
        return (
            <div className="flex items-center justify-center h-full" style={{ color: "var(--color-text-muted)" }}>
                Loading...
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {isSidebarCollapsed ? (
                <div
                    className="flex flex-col items-center shrink-0"
                    style={{ width: 28, borderRight: "1px solid var(--color-border)", paddingTop: 6 }}
                >
                    <button
                        onClick={() => setIsSidebarCollapsed(false)}
                        title="Show file tree"
                        className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                        style={{ width: 22, height: 22, borderRadius: 4, color: "var(--color-text-muted)" }}
                    >
                        <ExpandIcon size={13} />
                    </button>
                </div>
            ): (
                <div
                    className="flex flex-col shrink-0"
                    style={{ width: 200, borderRight: "1px solid var(--color-border)" }}
                >
                    <FileTreeToolbar
                        onNewFile={handleNewFile}
                        onNewFolder={handleNewFolder}
                        onCollapseSidebar={() => setIsSidebarCollapsed(true)}
                    />
                    <div 
                        className="flex-1 overflow-auto py-1"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setSelectedFolderPath(null);
                                setLastClickedPath(null);
                            }
                        }}
                    >
                        <FileTree
                            nodes={nodes}
                            parentPath={rootPath}
                            selectedPath={lastClickedPath}
                            expandedPaths={expandedPaths}
                            renamingPath={renamingPath}
                            onSelectFile={(path) => {
                                setSession({ openFilePath: path });
                                setLastClickedPath(path);
                            }}
                            onSelectFolder={(path) => {
                                setSelectedFolderPath(path);
                                setLastClickedPath(path);
                            }}
                            onSelectUnknown={(path) => setLastClickedPath(path)}
                            onToggleExpand={(path) =>
                                setExpandedPaths((prev) => {
                                    const next = new Set(prev);
                                    next.has(path) ? next.delete(path) : next.add(path);
                                    return next;
                                })
                            }
                            onStartRename={setRenamingPath}
                            onConfirmRename={handleConfirmRename}
                            onCancelRename={() => setRenamingPath(null)}
                            onContextMenu={(node, x, y) => setContextMenu({ node, x, y })}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col">
                {session.openFilePath ? (
                    <>
                        <EditorHeader filePath={session.openFilePath} />
                        <div className="flex-1 overflow-hidden">
                            <MarkdownEditor filePath={session.openFilePath} />
                        </div>
                    </>
                ): (
                    <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
                    </div>
                )}
            </div>

            {contextMenu && (
                <FileTreeContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onRename={() => {
                        setRenamingPath(contextMenu.node.path);
                        setContextMenu(null);
                    }}
                    onDelete={() => {
                        handleDelete(contextMenu.node);
                        setContextMenu(null);
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}

// Visible header in editor with filename and last modification text
// I'm probably gonna hate when a bug for this gets reported, Date objects are cursed
// regex because path is string btw
function EditorHeader({ filePath }: { filePath: string }) {
    const [modifiedAt, setModifiedAt] = useState<Date | null>(null);

    useEffect(() => {
        let cancelled = false;

        stat(filePath).then((info) => {
            if (!cancelled) setModifiedAt(info.mtime);
        });

        return () => {
            cancelled = true;
        };
    }, [filePath]);

    const fileName = displayName(filePath.split(/[\\/]/).pop() ?? filePath);

    return (
        <div
            className="flex items-center justify-center relative shrink-0"
            style={{
                height: 32,
                borderBottom: "1px solid var(--color-border)",
                fontSize: 13,
            }}
        >
            <span style={{ color: "var(--color-text)" }}>{fileName}</span>

            {modifiedAt && (
                <span
                    style={{
                        position: "absolute",
                        right: 12,
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                    }}
                >
                    Last modified: {modifiedAt.toLocaleDateString()} {modifiedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            )}
        </div>
    );
}