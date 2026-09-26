//
// Helper stuff for schema tools
//
import { FileText, SquareKanban, SquareChartGantt, Presentation, BookOpen, Library, Code, Database, FolderGit2, BookMarked } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
    FileText: <FileText size={14} />,
    SquareKanban: <SquareKanban size={14} />,
    SquareChartGantt: <SquareChartGantt size={14} />,
    Presentation: <Presentation size={14} />,
    BookOpen: <BookOpen size={14} />,
    Library: <Library size={14} />,
    Code: <Code size={14} />,
    Database: <Database size={14} />,
    FolderGit2: <FolderGit2 size={14} />,
    BookMarked: <BookMarked size={14} />,
};

export function getToolIcon(iconName: string): React.ReactNode {
    return iconMap[iconName] ?? null;
}