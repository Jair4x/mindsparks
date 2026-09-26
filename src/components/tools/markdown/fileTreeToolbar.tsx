import { useState } from "react";
import { FilePlus2 as FilePlus, FolderPlus, ArrowLeftToLine as CollapseIcon } from "lucide-react";

interface FileTreeToolbarProps {
    onNewFile:          () => void;
    onNewFolder:        () => void;
    onCollapseSidebar:  () => void;
}

export function FileTreeToolbar({ onNewFile, onNewFolder, onCollapseSidebar }: FileTreeToolbarProps) {
    return (
        <div
            className="flex items-center justify-between px-2"
            style={{ height: 32, borderBottom: "1px solid var(--color-border)" }}
        >
            <div className="flex items-center gap-1">
                <ToolbarButton icon={<FilePlus size={13} />} title="Create new file" onClick={onNewFile} />
                <ToolbarButton icon={<FolderPlus size={13} />} title="Create new folder" onClick={onNewFolder} />
            </div>
            <ToolbarButton icon={<CollapseIcon size={13} />} title="Collapse/hide file tree" onClick={onCollapseSidebar} />
        </div>
    );
}

function ToolbarButton({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title={title}
            className="flex items-center justify-center cursor-pointer bg-transparent border-none"
            style={{
                width: 22,
                height: 22,
                color: isHovered ? "var(--color-text)" : "var(--color-text-muted)",
                transition: "color 0.15s",
            }}
        >
            {icon}
        </button>
    );
}
