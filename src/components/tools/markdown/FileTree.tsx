import { useState } from "react";
import { Folder, FolderOpen, FileText } from "lucide-react";
import { displayName, type MarkdownFileNode } from "../../../lib/tools/markdown/markdownFileTree";

interface FileTreeProps {
    nodes:          MarkdownFileNode[];
    selectedPath:   string | null;
    expandedPaths:  Set<string>;
    onSelectFile:   (path: string) => void;
    onSelectFolder: (path: string) => void;
    onToggleExpand: (path: string) => void;
    depth?:         number;
}

export function FileTree({
    nodes,
    selectedPath,
    expandedPaths,
    onSelectFile,
    onSelectFolder,
    onToggleExpand,
    depth = 0,
}: FileTreeProps) {
    return (
        <div>
            {nodes.map((node) => (
                <FileTreeRow
                    key={node.path}
                    node={node}
                    depth={depth}
                    isSelected={node.path === selectedPath}
                    isExpanded={expandedPaths.has(node.path)}
                    onSelectFile={onSelectFile}
                    onSelectFolder={onSelectFolder}
                    onToggleExpand={onToggleExpand}
                >
                    {node.kind === "folder" && expandedPaths.has(node.path) && node.children && (
                        <FileTree
                            nodes={node.children}
                            selectedPath={selectedPath}
                            expandedPaths={expandedPaths}
                            onSelectFile={onSelectFile}
                            onSelectFolder={onSelectFolder}
                            onToggleExpand={onToggleExpand}
                            depth={depth + 1}
                        />
                    )}
                </FileTreeRow>
            ))}
        </div>
    );
}

function FileTreeRow({
    node,
    depth,
    isSelected,
    isExpanded,
    onSelectFile,
    onSelectFolder,
    onToggleExpand,
    children,
}: {
    node:           MarkdownFileNode;
    depth:          number;
    isSelected:     boolean;
    isExpanded:     boolean;
    onSelectFile:   (path: string) => void;
    onSelectFolder: (path: string) => void;
    onToggleExpand: (path: string) => void;
    children?:      React.ReactNode;
}) {
    const [isHovered, setIsHovered] = useState(false);

    function handleClick() {
        if (node.kind === "folder") {
            onToggleExpand(node.path);
            onSelectFolder(node.path);
        } else {
            onSelectFile(node.path);
        }
    }

    const textColor = isSelected
        ? "var(--color-accent-light)"
        : isHovered
            ? "var(--color-text)"
            : "var(--color-text-muted)";
    
    return (
        <div>
            <div
                onClick={handleClick}
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
                {node.kind === "folder"
                    ? (isExpanded ? <FolderOpen size={13} /> : <Folder size={13} />)
                    : <FileText size={13} />
                }
                <span className="truncate">{node.kind === "file" ? displayName(node.name) : node.name}</span>
            </div>
            {children}
        </div>
    );
}
