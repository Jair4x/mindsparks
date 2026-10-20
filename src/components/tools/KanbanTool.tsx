//
// The Kanban tool: a board with fixed columns (for now)
//

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useKanbanStore } from "../../store";
import type { ToolInstance } from "../../types";
import { KanbanColumnView } from "./kanban/KanbanColumnView";

export function KanbanTool({ flameId, instance }: { flameId: string; instance: ToolInstance }) {
    const board = useKanbanStore((s) => s.boards[flameId]);
    const { t } = useTranslation(["kanban", "common"]);
    
    useEffect(() => {
        useKanbanStore.getState().loadBoard(flameId);
    }, [flameId]);

    if (!board) {
        return (
            <div
                className="flex items-center justify-center h-full"
                style={{ fontSize: 13, color: "var(--color-text-muted)" }}
            >
                {t("common:loading")}
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-3 h-full overflow-x-auto overflow-y-hidden"
            style={{ padding: 16 }}
        >
            {board.columns.map((column) => (
                <KanbanColumnView
                    key={column.id}
                    column={column}
                    cards={board.cards.filter((card) => card.columnId === column.id)}
                />
            ))}
        </div>
    );
}
