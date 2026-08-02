//
// Helper stuff for schema tools
//
import { FileText, SquareKanban, SquareChartGantt, Presentation, BookOpen, Library, Code, Database, FolderGit2, BookMarked } from "lucide-react";
import type { Tool } from "../types";

const iconMap: Record<string, React.ReactNode> = {
    FileText: <FileText size={13} />,
    SquareKanban: <SquareKanban size={13} />,
    SquareChartGantt: <SquareChartGantt size={13} />,
    Presentation: <Presentation size={13} />,
    BookOpen: <BookOpen size={13} />,
    Library: <Library size={13} />,
    Code: <Code size={13} />,
    Database: <Database size={13} />,
    FolderGit2: <FolderGit2 size={13} />,
    BookMarked: <BookMarked size={13} />,
};

export function getToolIcon(iconName: string): React.ReactNode {
    return iconMap[iconName] ?? null;
}