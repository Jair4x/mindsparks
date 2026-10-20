//
// A single column of the Kanban board.
//  Just its name and card counter.
//
//

import { useTranslation } from "react-i18next";
import type { KanbanCard, KanbanColumn } from "../../../types";
import { KANBAN_COLUMN_WIDTH, KANBAN_COLUMN_MIN_HEIGHT } from "../../../lib/constants";

interface KanbanColumnViewProps {
    column: KanbanColumn;
    cards:  KanbanCard[];
}

export function KanbanColumnView({ column, cards }: KanbanColumnViewProps) {
    const { t } = useTranslation("kanban");

    return (
        <div
            className="flex flex-col shrink-0"
            style={{
                width: KANBAN_COLUMN_WIDTH,
                minHeight: KANBAN_COLUMN_MIN_HEIGHT,
                maxHeight: "100%",
                background: "var(--color-surface)",
                border: "0.5px solid var(--color-border-subtle)",
                borderRadius: 8,
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 shrink-0"
                style={{ height: 36 }}
            >
                <span style={{ fontSize: 12, color: "var(--color-text)" }}>
                    {column.key ? t(`columns.${column.key}`) : "Untitled"}
                </span>

                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {cards.length}
                </span>
            </div>

            {/* Cards (landing here in the next commit xd) */}
            <div
                className="flex-1 overflow-y-auto px-2 pb-2"
                style={{ minHeight: 0 }}
            />
        </div>
    );
}
