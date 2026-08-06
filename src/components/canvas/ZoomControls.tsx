//
// Canvas zoom controls
//  Not using React Flow's built-in controls because they look like absolute dogcrap.
//

import { useCallback, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Home, Maximize2, Minus, Plus } from "lucide-react";
import { useUIStore } from "../../store";
import {
    MIN_ZOOM     as MIN_ZOOM,
    MAX_ZOOM     as MAX_ZOOM,
    ZOOM_STEP    as ZOOM_STEP,
    DEFAULT_ZOOM
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
    const { zoomTo, getZoom, setViewport } = useReactFlow();
    const zoom = useUIStore((s) => s.zoom);
    const setZoom = useUIStore((s) => s.setZoom);

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
    }, [zoom, setZoom]);

    const handleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }, []);

    return (
        <div className="absolute bottom-3.5 right-3.5 z-20 flex items-center gap-1">
            {/* Reset button */}
            <ZoomButton
                icon={<Home size={13} />}
                label="Reset view"
                onClick={() => {
                    setViewport({ x: 0, y: 0, zoom: DEFAULT_ZOOM }, { duration: 200 });
                    setZoom(DEFAULT_ZOOM);
                }}
            />

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
                    border: "0.5px solid var(--color-border)",
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
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "0.5px solid var(--color-border)",
                background: isHovered ? "var(--color-surface-raised)" : "var(--color-surface)",
                color: disabled ? "var(--color-border)" : isHovered ? "var(--color-text)" : "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "background 0.15s, color 0.15s",
            }}
        >
            {icon}
        </button>
    );
}