//
// The editor for the markdown tool
//
// Uses milkdown as the library for it.
//

import { useEffect, useRef, useState } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { prism } from "@milkdown/plugin-prism";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

import "prosemirror-view/style/prosemirror.css";
import "./milkdown-editor.css";

const SAVE_DEBOUNCE_MS = 500;

function MilkdownInstance({ filePath, initialContent }: { filePath: string; initialContent: string }) {
    const saveTimeout       = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingContent    = useRef<string | null>(null); // last unsaved changes
    
    function flushPendingSave() {
        if (pendingContent.current === null) return;

        const content = pendingContent.current;
        pendingContent.current = null;

        writeTextFile(filePath, content).catch((e) =>
            console.error("Couldn't save markdown file: ", e)
        );
    }

    useEditor(
        (root) =>
            Editor.make()
                .config((ctx) => {
                    ctx.set(rootCtx, root);
                    ctx.set(defaultValueCtx, initialContent);
                })
                .use(commonmark)
                .use(gfm)
                .use(prism)
                .use(listener)
                .config((ctx) => {
                    ctx.get(listenerCtx).markdownUpdated((_ctx, markdown, prevMarkdown) => {
                        if (markdown === prevMarkdown) return;

                        pendingContent.current = markdown;

                        if (saveTimeout.current) clearTimeout(saveTimeout.current);

                        saveTimeout.current = setTimeout(() => {
                            saveTimeout.current = null;
                            flushPendingSave();
                        }, SAVE_DEBOUNCE_MS);
                    });
                }),
        []
    );

    // When editor gets unmounted (change active file or close panel)
    // save the unsaved changes
    useEffect(() => {
        return () => {
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
                saveTimeout.current = null;
            }
            flushPendingSave();
        };
    }, []);

    return <Milkdown />;
}

export function MarkdownEditor({ filePath }: { filePath: string }) {
    const [initialContent, setInitialContent] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setInitialContent(null);
        readTextFile(filePath).then((content) => {
            if (!cancelled) setInitialContent(content);
        });

        return () => {
            cancelled = true;
        };
    }, [filePath]);

    if (initialContent === null) {
        return (
            <div className="h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
                Loading...
            </div>
        );
    }

    return (
        <div className="milkdown-editor-root h-full overflow-auto">
            <MilkdownProvider>
                <MilkdownInstance key={filePath} filePath={filePath} initialContent={initialContent} />
            </MilkdownProvider>
        </div>
    );
}