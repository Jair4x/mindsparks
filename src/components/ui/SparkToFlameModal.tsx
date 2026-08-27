//
// Spark to flame conversion modal
//  Opens from the "Convert into flame" button in SparkModal.
//
// "convert" mode when creating a flame from a spark
// "manage" mode when managint tools inside a flame
//

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Check, Wrench } from "lucide-react";
import { useUIStore, useSparkStore, useFlameStore } from "../../store";
import { tools, schemas } from "../../lib/constants";
import { getToolIcon } from "../../lib/toolConfig";
import { reparentNode } from "../../store/cascade";
import type { Schema, Tool } from "../../types";

// --------------------------
// SparkToFlameModal
// --------------------------

export function SparkToFlameModal() {
    const activeModal           = useUIStore((s) => s.activeModal);
    const activeModalNodeId     = useUIStore((s) => s.activeModalNodeId);
    const closeModal            = useUIStore((s) => s.closeModal);
    const openFlame             = useUIStore((s) => s.openFlame);
    const activeFlameId         = useUIStore((s) => s.activeFlameId);
    
    const spark = useSparkStore((s) =>
        s.sparks.find((sp) => sp.id === activeModalNodeId)
    );
    const convertSpark          = useSparkStore((s) => s.convertSparkToFlame); // Setting up the field in the Spark object
    const convertSparkToFlame   = useFlameStore((s) => s.convertSparkToFlame);

    const requestRepulsion      = useUIStore((s) => s.requestRepulsion);

    const flame = useFlameStore((s) =>
        s.flames.find((f) => f.id === activeFlameId)
    );
    const updateFlameTools  = useFlameStore((s) => s.updateFlameTools);
    const updateFlameSchema = useFlameStore((s) => s.updateFlameSchema);

    if (activeModal === "spark-to-flame" && spark) {
        return (
            <ModalContent
                mode="convert"
                title="Convert to Flame"
                subtitle={spark.text}
                initialTools={[]}
                onClose={closeModal}
                onConfirm={(schemaName, selectedTools) => {
                    convertSpark(spark.id);
                    const newFlame = convertSparkToFlame({
                        sparkId: spark.id,
                        name: spark.text,
                        position: spark.position,
                        spaceId: spark.spaceId,
                        schema: schemaName,
                        tools: selectedTools,
                        categoryId: spark.categoryId,
                        parentId: spark.parentId,
                    });

                    // Restore connections if they were any
                    reparentNode(spark.id, newFlame.id);

                    requestRepulsion([newFlame.id]);
                    closeModal();
                    openFlame(newFlame.id);
                }}
            />
        );
    }

    if (activeModal === "manage-tools" && flame) {
        return (
            <ModalContent
                mode="manage"
                title="Manage Tools"
                subtitle={flame.name}
                initialTools={flame.tools}
                onClose={closeModal}
                onConfirm={(schemaName, selectedTools) => {
                    updateFlameTools(flame.id, selectedTools);
                    updateFlameSchema(flame.id, schemaName);
                    closeModal();
                }}
            />
        );
    }

    return null;
}

// --------------------------
// ModalContent
// --------------------------

function ModalContent({
    mode,
    title,
    subtitle,
    initialTools,
    onClose,
    onConfirm,
}: {
    mode: "convert" | "manage";
    title: string;
    subtitle: string;
    initialTools: string[];
    onClose: () => void;
    onConfirm: (schema: string, tools: string[]) => void;
}) {
    const defaultSchema = schemas.find((s) => s.name === "general") || schemas[0];
    const defaultTools = mode === "convert"
        ? defaultSchema.tools.filter((t) => tools.find((tool) => tool.name === t)?.enabled)
        : initialTools;

    const [selectedTools, setSelectedTools]     = useState<string[]>(defaultTools);
    const selectedSchema                        = useMemo(() => deriveSchemaFromTools(selectedTools), [selectedTools]);
    const overlayRef                            = useRef<HTMLDivElement>(null);

    const handleSchemaChange = (schemaName: string) => {
        const schema        = schemas.find((s) => s.name === schemaName);
        const preselected   = (schema?.tools ?? []).filter(
            (toolName) => tools.find((t) => t.name === toolName)?.enabled
        );
        setSelectedTools(preselected);
    };

    const toggleTool = (toolName: string) => {
        const tool = tools.find((t) => t.name === toolName);
        if (!tool?.enabled) return;
        
        setSelectedTools((prev) =>
            prev.includes(toolName)
                ? prev.filter((t) => t !== toolName)
                : [...prev, toolName]
        );
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const canConfirm = selectedTools.length > 0;

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.5)" }}
        >
            <div
                className="flex flex-col overflow-hidden"
                style={{
                    background: "var(--color-surface)",
                    border: "0.5px solid var(--color-border)",
                    borderRadius: 16,
                    width: 440,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center gap-2 px-5"
                    style={{
                        height: 52,
                        borderBottom: "0.5px solid var(--color-border)",
                    }}
                >
                    {mode === "convert"
                        ? <Flame size={15} color="var(--color-flame)" />
                        : <Wrench size={15} color="var(--color-accent)" />
                    }
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                            {title}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            {subtitle}
                        </div>
                    </div>
                </div>

                {/* Schemas (convert mode only) */}
                {mode === "convert" && (
                    <div className="px-5 pt-4 pb-3">
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8 }}>
                            SCHEMA
                        </div>
                        <div className="flex flex-col gap-2">
                            {schemas.map((schema) => (
                                <SchemaCard
                                    key={schema.name}
                                    schema={schema}
                                    isSelected={selectedSchema === schema.name}
                                    onClick={() => handleSchemaChange(schema.name)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Current schema (manage mode only) */}
                {mode === "manage" && (
                    <div className="px-5 pt-4" style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        Schema:{" "}
                        <span style={{ color: "var(--color-text)" }}>
                            {schemas.find((s) => s.name === selectedSchema)?.label ?? selectedSchema}
                        </span>
                    </div>
                )}

                {/* Tools */}
                <div
                    className="px-5 pt-3 pb-4"
                    style={{ borderTop: mode === "convert" ? "0.5px solid var(--color-border)" : "none" }}
                >
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8 }}>
                        TOOLS
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {tools.map((tool) => (
                            <ToolToggle
                                key={tool.name}
                                tool={tool}
                                isSelected={selectedTools.includes(tool.name)}
                                onClick={() => toggleTool(tool.name)}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="flex justify-end gap-2 px-5 py-3"
                    style={{ borderTop: "0.5px solid var(--color-border)" }}
                >
                    <button
                        onClick={onClose}
                        className="cursor-pointer bg-transparent"
                        style={{
                            border: "0.5px solid var(--color-border)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 13,
                            color: "var(--color-text-muted)",
                            fontFamily: "inherit",
                        }}
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => onConfirm(selectedSchema, selectedTools)}
                        disabled={!canConfirm}
                        className="flex items-center gap-1.5 border-none text-white"
                        style={{
                            background: !canConfirm ? "var(--color-border)" : "var(--color-accent)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            cursor: !canConfirm ? "not-allowed" : "pointer",
                        }}
                    >
                        {mode === "convert" ? <Flame size={13} /> : <Wrench size={13} />}
                        {mode === "convert" ? "Convert" : "Apply"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --------------------------
// deriveSchemaFromTools
//
// Finds the schema whose preset exactly matches the given tool set.
//
// Returns "custom" if no schema's preset matches.
// --------------------------
function deriveSchemaFromTools(selectedTools: string[]): string {
    const sorted = [...selectedTools].sort();

    const match = schemas.find((schema) => {
        if (schema.name === "custom") return false;

        const canonical = schema.tools
            .filter((t) => tools.find((tool) => tool.name === t)?.enabled)
            .sort();
        
        return canonical.length === sorted.length && canonical.every((t, i) => t === sorted[i]);
    });

    return match?.name ?? "custom";    
}

// --------------------------
// SchemaCard
// --------------------------

function SchemaCard({
    schema,
    isSelected,
    onClick,
}: {
    schema: Schema;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 text-left cursor-pointer w-full"
            style={{
                background: isSelected ? "var(--color-surface-raised)" : "transparent",
                border: `0.5px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                borderRadius: 8,
                padding: "8px 12px",
                fontFamily: "inherit",
                transition: "border-color 0.15s, background 0.15s",
            }}
        >
            <div
                className="flex items-center justify-center shrink-0"
                style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: `0.5px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                    transition: "border-color 0.15s",
                }}
            >
                {isSelected && (
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--color-accent)",
                        }}
                    />
                )}
            </div>
            <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>
                    {schema.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {schema.description}
                </div>
            </div>
        </button>
    );
}

// --------------------------
// ToolToggle
// --------------------------

function ToolToggle({
    tool,
    isSelected,
    onClick,
}: {
    tool: Tool;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={!tool.enabled}
            className="flex items-center gap-1.5 text-xs"
            style={{
                background: isSelected ? "var(--color-surface-raised)" : "transparent",
                border: `0.5px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
                borderRadius: 6,
                padding: "5px 10px",
                color: isSelected ? "var(--color-text)" : "var(--color-text-muted)",
                fontFamily: "inherit",
                transition: "all 0.15s",
                opacity: tool.enabled ? 1 : 0.4,
                cursor: tool.enabled ? "pointer" : "not-allowed",
            }}
        >
            {isSelected && <Check size={11} color="var(--color-accent)" />}
            <span style={{ color: isSelected ? "var(--color-accent)" : "inherit" }}>
                {getToolIcon(tool.icon)}
            </span>
            {tool.label}
            {!tool.enabled && (
                <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: 4 }}>
                    Soon...
                </span>
            )}
        </button>
    );
}