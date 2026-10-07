import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArchiveRestore, Trash2, Circle, Flame as FlameIcon, X } from "lucide-react";
import { useUIStore, useSpaceStore, useSparkStore, useFlameStore } from "../../store";
import { getSpaceIcon } from "../../lib/spaceIcons";
import { formatRelativeDate } from "../../lib/utils";
import type { Spark, Flame, Space } from "../../types";

type ArchivedNode =
    | ({ kind: "spark" } & Spark)
    | ({ kind: "flame" } & Flame);

// These styles are used repeatedly, so I'm just gonna
const selectStyle: React.CSSProperties = {
    background: "var(--color-surface-raised)",
    border: "0.5px solid var(--color-border)",
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: 12,
    color: "var(--color-text)",
    fontFamily: "inherit",
};

export function ArchiveModal() {
    const activeModal = useUIStore((s) => s.activeModal);
    const closeModal  = useUIStore((s) => s.closeModal);
    
    if (activeModal !== "archive-list") return null;

    return <ArchiveModalContent onClose={closeModal} />;
}

function ArchiveModalContent({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation("archive");

    const [typeFilter, setTypeFilter]   = useState<"all" | "spark" | "flame">("all");
    const [spaceFilter, setSpaceFilter] = useState<string>("all");
    const [search, setSearch]           = useState("");
    
    const [closeHovered, setCloseHovered] = useState(false);

    const overlayRef            = useRef<HTMLDivElement>(null);
    const mouseDownOnOverlay    = useRef(false);
    
    const spaces = useSpaceStore((s) => s.spaces);
    const sparks = useSparkStore((s) => s.sparks);
    const flames = useFlameStore((s) => s.flames);

    const spaceById = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);

    const hasActiveFilters = typeFilter !== "all" || spaceFilter !== "all" || search.trim().length > 0;

    const resetFilters = () => {
        setTypeFilter("all");
        setSpaceFilter("all");
        setSearch("");
    };

    const items: ArchivedNode[] = useMemo(() => {
        const archivedSparks = sparks.filter((s) => s.isArchived && !s.isConvertedToFlame).map((s) => ({ kind: "spark" as const, ...s }));
        const archivedFlames = flames.filter((f) => f.isArchived).map((f) => ({ kind: "flame" as const, ...f }));
        const query          = search.trim().toLowerCase();

        return [...archivedSparks, ...archivedFlames]
            .filter((node) => typeFilter === "all" || node.kind === typeFilter)
            .filter((node) => spaceFilter === "all" || node.spaceId === spaceFilter)
            .filter((node) => {
                if (query.length === 0) return true;
                const inName = node.name.toLowerCase().includes(query);
                const inDescription = (node.description ?? "").toLowerCase().includes(query);
                return inName || inDescription;
            })
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt, undefined, { numeric: true }));
    }, [sparks, flames, typeFilter, spaceFilter, search]);

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        mouseDownOnOverlay.current = e.target === overlayRef.current;
    };

    const handleOverlayMouseUp = (e: React.MouseEvent) => {
        if (mouseDownOnOverlay.current && e.target === overlayRef.current) onClose();
    };

    return (
        <div
            ref={overlayRef}
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
            className="fixed inset-0 flex justify-end z-50"
            style={{ background: "transparent" }}
        >
            <div
                className="flex flex-col overflow-hidden"
                style={{
                    background: "var(--color-surface)",
                    borderLeft: "0.5px solid var(--color-border)",
                    width: 360,
                    height: "100vh",
                    boxShadow: "-8px 0 32px var(--color-shadow)",
                }}
            >
                <div
                    className="flex items-center justify-between px-5 shrink-0"
                    style={{ height: 48, borderBottom: "0.5px solid var(--color-border)" }}
                >
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)"}}>
                        {t("title")}
                    </div>
                    <button
                        onClick={onClose}
                        onMouseEnter={() => setCloseHovered(true)}
                        onMouseLeave={() => setCloseHovered(false)}
                        className="flex items-center justify-center cursor-pointer bg-transparent border-none"
                        style={{ color: closeHovered ? "var(--color-text)" : "var(--color-text-muted)", transition: "color 0.15s" }}
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="flex flex-col gap-2 px-5 py-3" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("filters.searchPlaceholder")}
                        style={{ ...selectStyle, width: "100%" }}
                    />

                    <div className="flex items-center gap-2">
                        <ToggleButton
                            active={typeFilter === "spark"}
                            onClick={() => setTypeFilter((f) => (f === "spark" ? "all" : "spark"))}
                        >
                            {t("filters.onlySparks")}
                        </ToggleButton>

                        <ToggleButton
                            active={typeFilter === "flame"}
                            onClick={() => setTypeFilter((f) => (f === "flame" ? "all" : "flame"))}
                        >
                            {t("filters.onlyFlames")}
                        </ToggleButton>

                        <select
                            value={spaceFilter}
                            onChange={(e) => setSpaceFilter(e.target.value)}
                            style={{ ...selectStyle, marginLeft: "auto" }}
                        >
                            <option value="all">{t("filters.allSpaces")}</option>
                            {spaces.map((space) => (
                                <option key={space.id} value={space.id}>{space.name}</option>
                            ))}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="bg-transparent cursor-pointer border-none text-left"
                            style={{ fontSize: 12, color: "var(--color-accent)", padding: 0, alignSelf: "flex-start" }}
                        >
                            {t("filters.reset")}
                        </button>
                    )}
                </div>

                <div className="flex flex-col overflow-y-auto" style={{ padding: 8 }}>
                    {items.length === 0 && (
                        <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)"}}>
                            {t("empty")}
                        </div>
                    )}

                    {items.map((node) => (
                        <ArchivedRow key={node.id} node={node} space={spaceById.get(node.spaceId)} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function ToggleButton({
    active,
    onClick,
    children
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="border-none cursor-pointer"
            style={{
                fontSize: 12,
                padding: "5px 10px",
                borderRadius: 6,
                background: hovered
                    ? active
                        ? "var(--color-accent-light)"
                        : "var(--color-surface-raised)"
                    : active
                        ? "var(--color-accent)"
                        : "var(--color-surface)",
                color: hovered
                    ? "var(--color-text)"
                    : active
                        ? "var(--color-text)"
                        : "var(--color-text-muted)",
                fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s",
            }}
        >
            {children}
        </button>
    );
}

function ArchivedRow({ node, space }: { node: ArchivedNode; space: Space | undefined }) {
    const { t } = useTranslation("archive");

    const [step, setStep]               = useState<"idle" | "confirm" | "files">("idle");
    const [isDeleting, setIsDeleting]   = useState(false);

    const restoreSpark = useSparkStore((s) => s.restoreSpark);
    const restoreFlame = useFlameStore((s) => s.restoreFlame);

    const deleteSpark = useSparkStore((s) => s.deleteSpark);
    const deleteFlame = useFlameStore((s) => s.deleteFlame);

    const requestRepulsion = useUIStore((s) => s.requestRepulsion);

    const isFlame = node.kind === "flame";
    const SpaceIcon = space ? getSpaceIcon(space.icon) : null;

    const handleRestore = async () => {
        if (isFlame) {
            await restoreFlame(node.id);
        } else {
            await restoreSpark(node.id);
        }

        requestRepulsion([node.id]);
    };

    const handleDeleteConfirmed = async (filesAction?: "keep" | "delete") => {
        setIsDeleting(true);
        if (isFlame) {
            await deleteFlame(node.id, filesAction ?? "keep");
        } else {
            deleteSpark(node.id);
        }
    };

    if (isDeleting) return null; // the row's on node is already gone from the store by the time this'd re-render anyway

    return (
        <div
            className="flex flex-col gap-2"
            style={{ padding: "8px 10px", borderRadius: 8 }}
        >
            <div className="flex flex-col flex-1" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--color-text)" }}>{node.name}</div>
                <div className="flex items-center gap-2" style={{ fontSize: 11, color: "var(--color-text-muted" }}>
                    {isFlame
                        ? <FlameIcon size={10} fill="var(--color-flame)" color="var(--color-flame)" />
                        : <Circle size={8} fill="var(--color-soft-accent)" color="var(--color-soft-accent" />
                    }
                    <span>{t("archivedWhen", { when: formatRelativeDate(node.updatedAt, Date.now()) })}</span>
                    {space && SpaceIcon && (
                        <span className="flex items-center gap-1">
                            <SpaceIcon size={10} color={space.color ?? "var(--color-accent)"} />
                            {space.name}
                        </span>
                    )}
                </div>
            </div>

            {step === "idle" && (
                <div className="flex gap-1 shrink-0">
                    <IconButton icon={<ArchiveRestore size={14} />} label={t("actions.restore")} onClick={handleRestore} />
                    <IconButton icon={<Trash2 size={14} />} label={t("actions.delete")} danger onClick={() => setStep("confirm")} />
                </div>
            )}

            {step === "confirm" && (
                <div className="flex items-center gap-2 shrink-0" style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--color-danger-light)" }}>{t("actions.confirmQuestion")}</span>
                    <TextButton onClick={() => (isFlame ? setStep("files") : handleDeleteConfirmed())} danger>
                        {t("actions.confirmYes")}
                    </TextButton>
                    <TextButton onClick={() => setStep("idle")}>{t("actions.cancel")}</TextButton>
                </div>
            )}

            {step === "files" && (
                <div className="flex items-center gap-2 shrink-0" style={{ fontSize: 12 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{t("actions.filesQuestion")}</span>
                    <TextButton onClick={() => handleDeleteConfirmed("keep")}>{t("actions.filesKeep")}</TextButton>
                    <TextButton onClick={() => handleDeleteConfirmed("delete")} danger>{t("actions.filesDelete")}</TextButton>
                    <TextButton onClick={() => setStep("idle")}>{t("actions.cancel")}</TextButton>
                </div>
            )}
        </div>
    );
}

function IconButton({
    icon,
    label,
    onClick,
    danger = false,
}: {
    icon:       React.ReactNode;
    label:      string;
    onClick:    () => void;
    danger?:    boolean;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            aria-label={label}
            title={label}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="flex items-center justify-center cursor-pointer border-none"
            style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: hovered
                    ? danger
                        ? "var(--color-danger-surface)"
                        : "var(--color-surface-raised)"
                    : "transparent",
                color: hovered
                    ? danger ? "var(--color-danger)" : "var(--color-text)"
                    : danger ? "var(--color-danger-light)" : "var(--color-text-muted)",
                transition: "background 0.15s",
            }}
        >
            {icon}
        </button>
    );
}

function TextButton({
    children,
    onClick,
    danger = false,
}: {
    children:   React.ReactNode;
    onClick:    () => void;
    danger?:    boolean;
}) {
    return (
        <button
            onClick={onClick}
            className="border-none bg-transparent cursor-pointer"
            style={{
                fontSize: 12,
                color: danger ? "var(--color-danger-light)" : "var(--color-text)",
                fontFamily: "inherit",
                textDecoration: "underline",
            }}
        >
            {children}
        </button>
    );
}
