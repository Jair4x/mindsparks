import { useState, useRef } from "react";
import { useFlameStore, useUIStore } from "../../store";
import { convertFlameToSpark } from "../../store/cascade";
import { useTranslation } from "react-i18next";

export function FlameToSparkModal() {
    const activeModal                               = useUIStore((s) => s.activeModal);
    const activeModalNodeId                         = useUIStore((s) => s.activeModalNodeId);
    const closeModal                                = useUIStore((s) => s.closeModal);
    const goBack                                    = useUIStore((s) => s.goBack);
    const activeView                                = useUIStore((s) => s.activeView);
    const overlayRef                                = useRef<HTMLDivElement>(null);
    const mouseDownOnOverlay                        = useRef(false);
    const flame                                     = useFlameStore((s) => s.flames.find((f) => f.id === activeModalNodeId));
    const { t }                                     = useTranslation(["nodes", "common"]);
    const [isConverting, setIsConverting]           = useState(false);
    const [isCancelHovered, setIsCancelHovered]     = useState(false);
    const [isConfirmHovered, setIsConfirmHovered]   = useState(false);

    if (activeModal !== "flame-to-spark" || !flame) return null;

    const handleConfirm = async () => {
        setIsConverting(true);
        await convertFlameToSpark(flame.id);  
        closeModal();

        if (activeView === "flame") goBack();
    };

    const handleOverlayMouseDown = (e: React.MouseEvent) => {
        mouseDownOnOverlay.current = e.target === overlayRef.current;
    };

    const handleOverlayMouseUp = (e: React.MouseEvent) => {
        if (mouseDownOnOverlay.current && e.target === overlayRef.current) closeModal();
    };

    return (
        <div
            ref={overlayRef}
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "var(--color-overlay)" }}
        >
            <div
                className="flex flex-col overflow-hidden"
                style={{
                    background: "var(--color-surface)",
                    border: "0.5px solid var(--color-border)",
                    borderRadius: 16,
                    width: 360,
                    boxShadow: "0 8px 32px var(--color-shadow)",
                }}
            >
                <div
                    className="flex items-center px-5"
                    style={{
                        height: 48,
                        borderBottom: "0.5px solid var(--color-border)",
                        flexShrink: 0,
                    }}
                >
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)" }}>
                        {t("flameToSpark.title")}
                    </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3">
                    <div style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.5 }}>
                        {t("flameToSpark.confirm")}
                        <br />
                        <br />
                        <span style={{ color: "var(--color-danger)" }}>
                            {t("flameToSpark.confirmB")}
                        </span>
                    </div>
                </div>

                <div
                    className="flex justify-end gap-2 px-5 py-3"
                    style={{ borderTop: "0.5px solid var(--color-border)" }}
                >
                    <button
                        onClick={closeModal}
                        disabled={isConverting}
                        className="cursor-pointer"
                        style={{
                            background: isCancelHovered
                                ? "var(--color-surface-raised)"
                                : "transparent",
                            border: "0.5px solid var(--color-border)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 13,
                            color: isCancelHovered
                                ? "var(--color-text)"
                                : "var(--color-text-muted)",
                            fontFamily: "inherit",
                            transition: "color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={() => setIsCancelHovered(true)}
                        onMouseLeave={() => setIsCancelHovered(false)}
                    >
                        {t("common:cancel")}
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={isConverting}
                        className="border-none cursor-pointer text-white"
                        style={{
                            background: isConfirmHovered
                                ? "var(--color-danger)"
                                : "var(--color-danger-dark)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            opacity: isConverting ? 0.6 : 1,
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={() => setIsConfirmHovered(true)}
                        onMouseLeave={() => setIsConfirmHovered(false)}
                    >
                        {t("common:sure")}
                    </button>
                </div>
            </div>
        </div>
    );
}
