import { useEffect, useState } from "react";
import { writeTextFile, mkdir, stat } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useFlameStore, useSpaceStore } from "../../store";
import { useToolSession } from "../../hooks";
import { markdownAdapter } from "../../lib/tools/adapters";
import { buildFileTree, generateUniqueName, getChildrenAt, displayName, type MarkdownFileNode } from "../../lib/tools/markdown/markdownFileTree";
import { FileTreeToolbar } from "./markdown/fileTreeToolbar";
import { FileTree } from "./markdown/FileTree";
import type { ToolInstance } from "../../types";

import { ArrowRightToLine as ExpandIcon } from "lucide-react";

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
                            selectedPath={lastClickedPath}
                            expandedPaths={expandedPaths}
                            onSelectFile={(path) => {
                                setSession({ openFilePath: path });
                                setLastClickedPath(path);
                            }}
                            onSelectFolder={(path) => {
                                setSelectedFolderPath(path);
                                setLastClickedPath(path);
                            }}
                            onToggleExpand={(path) => 
                                setExpandedPaths((prev) => {
                                    const next = new Set(prev);
                                    next.has(path) ? next.delete(path) : next.add(path);
                                    return next;
                                })
                            }
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col">
                {session.openFilePath ? (
                    <>
                        <EditorHeader filePath={session.openFilePath} />
                        <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
                            Editor coming soon on another commit I guess.
                            <br />
                            Path: {session.openFilePath}
                        </div>
                    </>
                ): (
                    <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
                    </div>
                )}
            </div>
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