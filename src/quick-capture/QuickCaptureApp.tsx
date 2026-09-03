//
// Root of the quick-capture window. A completely different mini-app.
//
// It DOES NOT import useSpaceStore, useSparkStore or any store for that matter
//  because they live in the runtime of the main window. All this app knows is that data comes through events.
//

import { useEffect, useRef, useState, type SyntheticEvent, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import {
    SPACES_UPDATED_EVENT,
    CREATE_SPARK_EVENT,
    QUICK_CAPTURE_READY_EVENT,
    QUICK_CAPTURE_OPEN_EVENT,
    type SpacesUpdatedPayload,
    type QuickCaptureOpenPayload,
    type QuickCaptureMode,
} from "../lib/quickCaptureEvents";
import type { Space, Position } from "../types";

const GLOBAL_MODE_SIZE = { width: 480, height: 195 }; // Because it has the header and stuff
const INLINE_MODE_SIZE = { width: 480, height: 140 };

export function QuickCaptureApp() {
    const [mode, setMode]                   = useState<QuickCaptureMode>("global");
    const [spaces, setSpaces]               = useState<Space[]>([]);
    const [spaceId, setSpaceId]             = useState("");
    const [sparkPosition, setSparkPosition] = useState<Position>({ x: 0, y: 0 });
    const [text, setText]                   = useState("");
    const inputRef                          = useRef<HTMLInputElement>(null);

    // Spaces.
    // Only used on "global" mode, but it doesn't hurt to always have them ready.
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        listen<SpacesUpdatedPayload>(SPACES_UPDATED_EVENT, (event) => {
            setSpaces(event.payload.spaces);
            setSpaceId((current) => current || event.payload.spaces[0]?.id || "");
        }).then((fn) => {
            unlisten = fn;
            emitTo("main", QUICK_CAPTURE_READY_EVENT);
        });

        return () => {
            unlisten?.();
        };
    }, []);

    // Opening
    // Decides the mode, the space (fixed on "inline", chosen on "global") and where the new Spark ends up in the canvas.
    useEffect(() => {
        const unlisten = listen<QuickCaptureOpenPayload>(QUICK_CAPTURE_OPEN_EVENT, async (event) => {
            const { mode: newMode, spaceId: fixedSpaceId, sparkPosition: newPosition } = event.payload;

            setMode(newMode);
            setSparkPosition(newPosition ?? { x: 200, y: 200 });

            if (newMode === "inline" && fixedSpaceId) {
                setSpaceId(fixedSpaceId);
            }

            setText("");

            const size = newMode === "global" ? GLOBAL_MODE_SIZE : INLINE_MODE_SIZE;

            await getCurrentWindow().setSize(new LogicalSize(size.width, size.height));
            await getCurrentWindow().show();
            await getCurrentWindow().setFocus();
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    useEffect(() => {
        const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
            if (focused) inputRef.current?.focus();
        });

        return () => {
            unlisten.then((fn) => fn());
        };
    }, []);

    async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        const trimmed = text.trim();
        if (!trimmed || !spaceId) return;

        await emitTo("main", CREATE_SPARK_EVENT, {
            text: trimmed,
            spaceId,
            position: sparkPosition,
        });

        setText("");
        await getCurrentWindow().hide();
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Escape") getCurrentWindow().hide();
    }

    return (
        <div
            className="w-screen h-screen flex flex-col items-center justify-center p-2"
            style={{ background: "transparent" }}
        >
            {mode === "global" && (
                <span
                    style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--color-accent-light)",
                    }}
                >
                    MindSparks
                </span>
            )}
            <form
                onSubmit={handleSubmit}
                className="w-full h-full flex flex-col justify-between px-5 py-4"
                style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-accent)",
                    borderRadius: 14,
                    marginTop: mode === "global" ? 5 : 0,
                }}
            >
                {mode === "global" && (
                    <div className="flex flex-row items-center gap-1">
                        <label
                            htmlFor="quick-capture-space"
                            style={{ fontSize: 12, color: "var(--color-text-muted)" }}
                        >
                            Space to send this idea to:
                        </label>
                        <div style={{ position: "relative" }}>
                            <select
                                id="quick-capture-space"
                                value={spaceId}
                                onChange={(e) => setSpaceId(e.target.value)}
                                style={{
                                    appearance: "none",
                                    WebkitAppearance: "none",
                                    background: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    fontSize: 12,
                                    border: "1px solid var(--color-border)",
                                    borderRadius: 6,
                                    padding: "5px 28px 5px 8px",
                                    cursor: "pointer",
                                }}
                            >
                                {spaces.map((space) => (
                                    <option key={space.id} value={space.id}>
                                        {space.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                size={12}
                                style={{
                                    position: "absolute",
                                    right: 8,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    pointerEvents: "none",
                                    color: "var(--color-text-muted)",
                                }}
                            />
                        </div>
                    </div>
                )}

                <input
                    ref={inputRef}
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What's the idea?"
                    style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--color-text)",
                        fontSize: 18,
                    }}
                />

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!text.trim() || !spaceId}
                        style={{
                            background: "var(--color-accent)",
                            color: "var(--color-bg)",
                            borderRadius: 6,
                            padding: "6px 14px",
                            fontSize: 13,
                            border: "none",
                            opacity: !text.trim() || !spaceId ? 0.5 : 1,
                        }}
                    >
                        Capture
                    </button>
                </div>
            </form>
        </div>
    );
}