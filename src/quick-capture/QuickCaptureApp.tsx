//
// Root of the quick-capture window. A completely different mini-app.
//
// It DOES NOT import useSpaceStore, useSparkStore or any store for that matter
//  because they live in the runtime of the main window. All this app knows is that data comes through events.
//

import { useEffect, useRef, useState, type SyntheticEvent, type KeyboardEvent } from "react";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
    SPACES_UPDATED_EVENT,
    CREATE_SPARK_EVENT,
    QUICK_CAPTURE_READY_EVENT,
    type SpacesUpdatedPayload,
} from "../lib/quickCaptureEvents";
import type { Space } from "../types";

export function QuickCaptureApp() {
    const [spaces, setSpaces]   = useState<Space[]>([]);
    const [spaceId, setSpaceId] = useState("");
    const [text, setText]       = useState("");
    const inputRef              = useRef<HTMLInputElement>(null);

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

        await emitTo("main", CREATE_SPARK_EVENT, { text: trimmed, spaceId });

        setText("");
        await getCurrentWindow().hide();
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Escape") getCurrentWindow().hide();
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="w-screen h-screen flex flex-col justify-between px-5 py-4"
            style={{ background: "var(--color-bg)" }}
        >
            <div className="flex flex-row items-center gap-1">
                <label
                    htmlFor="quick-capture-space"
                    style={{ fontSize: 12, color: "var(--color-text-muted)" }}
                >
                    Space to send this idea to:
                </label>
                <select
                    id="quick-capture-space"
                    value={spaceId}
                    onChange={(e) => setSpaceId(e.target.value)}
                    style={{
                        background: "transparent",
                        color: "var(--color-text-muted)",
                        fontSize: 12,
                        border: "1px solid var(--color-border)",
                        borderRadius: 6,
                        padding: "4px 8px",
                    }}
                >
                    {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                            {space.name}
                        </option>
                    ))}
                </select>
            </div>

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
    );
}