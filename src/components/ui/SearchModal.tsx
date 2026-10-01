//
// Node search modal
//
// I don't know what more do you want to see
//

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search as SearchIcon, Flame as FlameIcon, Circle } from "lucide-react";
import { useUIStore, useSpaceStore, useSparkStore, useFlameStore } from "../../store";
import { searchNodes, type SearchResult } from "../../lib/searchNodes";
import { getSpaceIcon } from "../../lib/spaceIcons";
import { formatRelativeDate } from "../../lib/utils";

export function SearchModal({
    onSelectResult,
}: {
    onSelectResult: (nodeId: string, spaceId: string) => void;
}) {
    const activeModal   = useUIStore((s) => s.activeModal);
    const closeModal    = useUIStore((s) => s.closeModal);
    
    if (activeModal !== "search") return null;

    return <SearchModalContent onSelectResult={onSelectResult} onClose={closeModal} />
}

function SearchModalContent({
    onSelectResult,
    onClose
}: {
    onSelectResult: (nodeId: string, spaceId: string) => void;
    onClose:        () => void;
}) {
    const { t } = useTranslation("search");
    const [query, setQuery] = useState("");

    const overlayRef            = useRef<HTMLDivElement>(null);
    const mouseDownOnOverlay    = useRef(false);

    const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
    const spaces        = useSpaceStore((s) => s.spaces);
    const sparks        = useSparkStore((s) => s.sparks);
    const flames        = useFlameStore((s) => s.flames);
    
    const results = useMemo(
        () => searchNodes(query, sparks, flames, spaces, activeSpaceId),
        [query, sparks, flames, spaces, activeSpaceId]
    );

    const hasSameSpace      = results.sameSpace.length > 0;
    const hasOtherSpaces    = results.otherSpaces.length > 0;
    const hasQuery          = query.trim().length > 0;
    const hasResults        = hasSameSpace || hasOtherSpaces;
    
    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        mouseDownOnOverlay.current = e.target === overlayRef.current;
    };

    const handleOverlayMouseUp = (e: React.MouseEvent) => {
        if (mouseDownOnOverlay.current && e.target === overlayRef.current) onClose();
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    }

    const handleSelect = (result: SearchResult) => {
        onSelectResult(result.node.id, result.node.spaceId);
        onClose();
    };

    return (
        <div
            ref={overlayRef}
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
            onKeyDown={handleKeyDown}
            className="fixed inset-0 flex items-start justify-center z-50"
            style={{ background: "var(--color-overlay)", paddingTop: "15vh" }}
        >
            <div className="flex flex-col gap-3" style={{ width: 640, maxHeight: "70vh" }}>
                <div
                    className="flex items-center gap-2"
                    style={{
                        background: "var(--color-surface)",
                        border: "0.5px solid var(--color-border)",
                        borderRadius: 12,
                        padding: "12px 16px",
                        boxShadow: "0 8px 32px var(--color-shadow)",
                    }}
                >
                    <SearchIcon size={16} color="var(--color-text-muted" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("placeholder")}
                        style={{
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            fontSize: 15,
                            color: "var(--color-text)",
                            fontFamily: "inherit",
                            width: "100%",
                        }}
                    />
                </div>

                {hasQuery && (
                    <div
                        className="flex gap-3 overflow-y-auto"
                        style={{
                            background: "var(--color-surface)",
                            border: "0.5px solid var(--color-border)",
                            borderRadius: 12,
                            padding: 12,
                            boxShadow: "0 8px 32px var(--color-shadow)",
                        }}
                    >
                        {!hasResults && (
                            <div style={{ padding: 16, fontSize: 13, color: "var(--color-text-muted)", width: "100%", textAlign: "center" }}>
                                {t("noResults", { query })}
                            </div>
                        )}

                        {hasSameSpace && (
                            <ResultColumn
                                title={t("sameSpace")}
                                results={results.sameSpace}
                                full={!hasOtherSpaces}
                                onSelect={handleSelect}
                            />
                        )}

                        {hasOtherSpaces && (
                            <ResultColumn
                                title={t("otherSpaces")}
                                results={results.otherSpaces}
                                full={!hasSameSpace}
                                onSelect={handleSelect}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ResultColumn({
    title,
    results,
    full,
    onSelect,
}: {
    title:      string;
    results:    SearchResult[];
    full:       boolean;
    onSelect:   (result: SearchResult) => void;
}) {
    return (
        <div className="flex flex-col gap-1" style={{ width: full ? "100%" : "50%", minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "4px 8px" }}>
                {title}
            </div>
            {results.map((result) => (
                <ResultRow
                    key={result.node.id}
                    result={result}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}

function ResultRow({
    result,
    onSelect,
}: {
    result:     SearchResult;
    onSelect:   (result: SearchResult) => void;
}) {
    const { t }                 = useTranslation("search");
    const [hovered, setHovered] = useState(false);

    const { node, matchStart, matchLength, space } = result;
    const isFlame = node.kind === "flame";
    const SpaceIcon = getSpaceIcon(space.icon);

    return (
        <button
            onClick={() => onSelect(result)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex flex-col items-start text-left cursor-pointer border-none"
            style={{
                background: hovered ? "var(--color-surface-raised)" : "transparent",
                borderRadius: 8,
                padding: "8px 10px",
                width: "100%",
                fontFamily: "inherit",
            }}
        >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                <HighlightedText text={node.name} matchStart={matchStart} matchLength={matchLength} />
            </div>

            <div
                className="line-clamp-1"
                style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}
            >
                {"description" in node ? node.description : t("noDescription")}
            </div>

            <div className="flex items-center gap-2" style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted"}}>
                {isFlame
                    ? <FlameIcon size={10} fill="var(--color-flame)" color="var(--color-flame)" />
                    : <Circle size={8} fill="var(--color-soft-accent)" color="var(--color-soft-accent)" />
                }
                <span>{formatRelativeDate(node.createdAt, Date.now())}</span>

                {node.spaceId === space.id && (
                    <span className="flex items-center gap-1" style={{ marginLeft: "auto", color: "var(--color-soft-accent)" }}>
                        <SpaceIcon size={10} style={{ alignSelf: "center"}} color={space.color ?? "var(--color-accent)"} />
                        {space.name}
                    </span>
                )}
            </div>
        </button>
    );
}

function HighlightedText({
    text,
    matchStart,
    matchLength
}: {
    text:           string;
    matchStart:     number;
    matchLength:    number;
}) {
    if (matchStart === -1) return <>{text}</>;

    const before    = text.slice(0, matchStart);
    const match     = text.slice(matchStart, matchStart + matchLength);
    const after     = text.slice(matchStart + matchLength);

    return (
        <>
            {before}
            <span style={{ color: "var(--color-accent)" }}>{match}</span>
            {after}
        </>
    );
}
