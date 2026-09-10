import { useEffect, useState } from "react";
import { Folder, FolderOpen, FileText, FileQuestion } from "lucide-react";
import { displayName, type MarkdownFileNode } from "../../../lib/tools/markdown/markdownFileTree";

interface FileTreeProps {
    nodes:              MarkdownFileNode[];
    parentPath:         string;
    selectedPath:       string | null;
    expandedPaths:      Set<string>;
    renamingPath:       string | null;
    onSelectFile:       (path: string) => void;
    onSelectFolder:     (path: string) => void;
    onSelectUnknown:    (path: string) => void;
    onToggleExpand:     (path: string) => void;
    onStartRename:      (path: string) => void;
    onConfirmRename:    (node: MarkdownFileNode, parentPath: string, newName: string) => void;
    onCancelRename:     () => void;
    onContextMenu:      (node: MarkdownFileNode, x: number, y: number) => void;
    depth?:             number;
}

interface FileTreeRowProps {
    node:               MarkdownFileNode;
    parentPath:         string;
    depth:              number;
    isSelected:         boolean;
    isExpanded:         boolean;
    isRenaming:         boolean;
    onSelectFile:       (path: string) => void;
    onSelectFolder:     (path: string) => void;
    onSelectUnknown:    (path: string) => void;
    onToggleExpand:     (path: string) => void;
    onStartRename:      (path: string) => void;
    onConfirmRename:    (node: MarkdownFileNode, parentPath: string, newName: string) => void;
    onCancelRename:     () => void;
    onContextMenu:      (node: MarkdownFileNode, x: number, y: number) => void;
    children?:          React.ReactNode;
}

export function FileTree({ nodes, parentPath, ...theRest }: FileTreeProps) { // listen okay it's a lot of props, don't judge
    return (
        <div>
            {nodes.map((node) => (
                <FileTreeRow
                    key={node.path}
                    node={node}
                    parentPath={parentPath}
                    depth={theRest.depth ?? 0}
                    isSelected={node.path === theRest.selectedPath}
                    isExpanded={theRest.expandedPaths.has(node.path)}
                    isRenaming={node.path === theRest.renamingPath}
                    {...theRest}
                >
                    {node.kind === "folder" && theRest.expandedPaths.has(node.path) && node.children && (
                        <FileTree {...theRest} nodes={node.children} parentPath={node.path} depth={(theRest.depth ?? 0) + 1} />
                    )}
                </FileTreeRow>
            ))}
        </div>
    );
}

function FileTreeRow({
    node,
    parentPath,
    depth,
    isSelected,
    isExpanded,
    isRenaming,
    onSelectFile,
    onSelectFolder,
    onSelectUnknown,
    onToggleExpand,
    onStartRename,
    onConfirmRename,
    onCancelRename,
    onContextMenu,
    children,
}: FileTreeRowProps) {
    const [isHovered, setIsHovered] = useState(false);
    const currentDisplayName        = node.kind === "file" && node.isMarkdown ? displayName(node.name) : node.name;
    const [draftName, setDraftName] = useState(currentDisplayName);

    useEffect(() => {
        if (isRenaming) setDraftName(currentDisplayName);
    }, [isRenaming, currentDisplayName]);

    function handleClick() {
        if (node.kind === "folder") {
            onToggleExpand(node.path);
            onSelectFolder(node.path);
        } else if (node.isMarkdown) {
            onSelectFile(node.path);
        } else {
            onSelectUnknown(node.path);
        }
    }

    function handleDoubleClick(e: React.MouseEvent) {
        e.stopPropagation();
        onStartRename(node.path);
    }

    function handleRenameKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            onConfirmRename(node, parentPath, draftName);
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancelRename();
        }
    }

    const textColor = isSelected
        ? "var(--color-accent-light)"
        : isHovered
            ? "var(--color-text)"
            : "var(--color-text-muted)";


    let icon = <FileText size={13} />;    
    if (node.kind === "folder") {
        icon = isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />;
    } else if (!node.isMarkdown) {
        icon = <FileQuestion size={13} />;
    }

    return (
        <div>
            <div
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(node, e.clientX, e.clientY);
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="flex items-center gap-1.5 cursor-pointer"
                style={{
                    paddingLeft: 8 + depth * 14,
                    height: 26,
                    fontSize: 12.5,
                    background: isSelected ? "var(--color-surface-raised)" : "transparent",
                    color: textColor,
                    transition: "color 0.15s",
                }}
            >
                {icon}
                {isRenaming ? (
                    <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={() => onConfirmRename(node, parentPath, draftName)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-accent)",
                            borderRadius: 3,
                            color: "var(--color-text)",
                            fontSize: "inherit",
                            fontFamily: "inherit",
                            padding: "0 3px",
                            width: "100%",
                            outline: "none",
                        }}
                    /> 
                ): (
                    <span className="truncate">{currentDisplayName}</span>
                )}
            </div>
            {children}
        </div>
    );
}
