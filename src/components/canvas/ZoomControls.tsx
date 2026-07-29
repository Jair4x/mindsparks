//
// Canvas zoom controls
//  Not using React Flow's built-in controls because they look like absolute dogcrap.
//

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useUIStore } from "../../store";
import {
    CANVAS_MIN_ZOOM     as MIN_ZOOM,
    CANVAS_MAX_ZOOM     as MAX_ZOOM,
    CANVAS_ZOOM_STEP    as ZOOM_STEP
} from "../../lib/constants";

// Handling scroll zoom on canvas instead of React Flow
export function handleScroll(
    e: React.WheelEvent<HTMLDivElement>,
    getZoom: () => number,
    zoomTo: (zoom: number, options?: { duration?: number }) => void,
    setZoom: (zoom: number) => void,
) {
    const currentZoom = getZoom();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((currentZoom + delta) * 10) / 10));
    zoomTo(newZoom);
    setZoom(newZoom);
}

export function ZoomControls() {
    const { zoomIn, zoomOut, zoomTo, getZoom } = useReactFlow();
    const zoom = useUIStore((state) => state.zoom);
    const setZoom = useUIStore((state) => state.setZoom);

    // Sync React Flow's zoom with UI Store
    const handleZoomIn = useCallback(() => {
        const newZoom = Math.min(MAX_ZOOM, Math.round((zoom + ZOOM_STEP) * 10) / 10);
        zoomTo(newZoom, { duration: 150 });
        setZoom(newZoom)
    }, [zoom, zoomTo, setZoom]);

    const handleZoomOut = useCallback(() => {
        const newZoom = Math.max(MIN_ZOOM, Math.round((zoom - ZOOM_STEP) * 10) / 10);
        zoomTo(newZoom, { duration: 150 });
        setZoom(newZoom)
    }, [zoom, getZoom, setZoom]);

    const handleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }, []);

    return (
        <div
            className="absolute bottom-3.5 right-3.5 z-20 flex items-center gap-1"
        >
            {/* Full screen */}
            <ZoomButton
                icon={<Maximize2 size={13} />}
                label="Toggle fullscreen"
                onClick={handleFullscreen}
            />

            {/* Zoom indicator */}
            <div
                style={{
                    background: "var(--color-surface)",
                    border: "0.5ps solid var(--color-border)",
                    borderRadius: 6,
                    height: 28,
                    minWidth: 48,
                    padding: "0 8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                    cursor: "default",
                    userSelect: "none",
                }}
            >
                {Math.round(zoom * 100)}%
            </div>

            {/* Zoom out */}
            <ZoomButton
                icon={<Minus size={13} />}
                label="Zoom out"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
            />

            {/* Zoom in */}
            <ZoomButton
                icon={<Plus size={13} />}
                label="Zoom in"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
            />
        </div>
    );
}

// --------------------------
// ZoomButton
// --------------------------

function ZoomButton({
    icon,
    label,
    onClick,
    disabled = false,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface)",
                color: disabled ? "var(--color-border)" : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "not-allowed" : "pointer",
            }}
        >
            {icon}
        </button>
    );
}