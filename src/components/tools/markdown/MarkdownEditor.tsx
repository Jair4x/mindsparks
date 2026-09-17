//
// The editor for the markdown tool
//
// Uses milkdown as the library for it.
//

import { useEffect, useRef, useState, useMemo } from "react";
import { readTextFile, writeTextFile, exists, watch } from "@tauri-apps/plugin-fs";
import { dirname, join } from "@tauri-apps/api/path";
import { flattenFiles, type MarkdownFileNode } from "../../../lib/tools/markdown/markdownFileTree";
import { toRelativePath } from "../../../lib/tools/markdown/relativePath";

import { ATOMIC_CODE_LANGUAGES } from "@atomic-editor/editor/code-languages";
import { AtomicCodeMirrorEditor, wikiLinks } from "@atomic-editor/editor";
import '@atomic-editor/editor/styles.css';
import '../styles/MarkdownEditor.css';

import { stylizedCodeBlocks } from "../../../lib/tools/markdown/stylizedCodeBlocks";
import { extraCallouts } from "../../../lib/tools/markdown/extraCallouts";
import { EditorView, placeholder } from "@codemirror/view";
import { setupViewListener } from "../../../lib/tools/markdown/externalChangeExt";

interface MarkdownEditorProps {
    filePath:   string;
    fileTree:   MarkdownFileNode[];
    onOpenFile: (path: string) => void;
}

const SAVE_DEBOUNCE_MS = 500;

export function MarkdownEditor({ filePath, fileTree, onOpenFile }: MarkdownEditorProps) {
    const [initialContent, setInitialContent]   = useState<string | null>(null);
    const [externalContent, setExternalContent] = useState<string | null>(null);

    const viewRef                               = useRef<EditorView | null>(null);
    const currentContent                        = useRef(""); // what's on the editor right now
    const lastPersistedContent                  = useRef(""); // the last we KNOW it's saved on disk
    const saveTimeout                           = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    useEffect(() => {
        let cancelled = false;
        setInitialContent(null);
        setExternalContent(null);

        readTextFile(filePath).then((content) => {
            if (cancelled) return;

            currentContent.current = content;
            lastPersistedContent.current = content;
            setInitialContent(content);
        });

        return () => {
            cancelled = true;
        };
    }, [filePath]);

    // Watcher for the current opened file
    useEffect(() => {
        let cancelled = false;
        let unwatch: (() => void) | undefined;

        watch(
            filePath,
            async (event) => {
                const changedPaths: string[] = (event as { paths?: string[] }).paths ?? [];
                const affectsThisFile = changedPaths.some(
                    (p) => p.replace(/\\/g, "/") === filePath.replace(/\\/g, "/")
                );
                if (!affectsThisFile) return;

                const diskContent = await readTextFile(filePath).catch(() => null);
                if (diskContent === null) return; // file could've been deleted
                if (diskContent === lastPersistedContent.current) return; // echo from saving the file

                setExternalContent(diskContent);
            },
            { delayMs: 300 }
        ).then((fn) => {
            if (cancelled) {
                fn();
            } else {
                unwatch = fn;
            }
        });

        return () => {
            cancelled = true;
            unwatch?.();
        };
    }, [filePath]);

    function persistNow(content: string) {
        lastPersistedContent.current = content;
        writeTextFile(filePath, content).catch((e) => console.error("Couldn't save markdown file: ", e));
    }

    function handleChange(markdown: string) {
        currentContent.current = markdown;

        if (saveTimeout.current) clearTimeout(saveTimeout.current);

        saveTimeout.current = setTimeout(() => {
            saveTimeout.current = null;
            persistNow(currentContent.current);
        }, SAVE_DEBOUNCE_MS);
    }

    // Save the unsaved changes if any
    // when unmounting or changing file.
    // Different from handleChange above because this only happens ↑↑
    useEffect(() => {
        return () => {
            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
                saveTimeout.current = null;
                persistNow(currentContent.current);
            }
        };
    }, [filePath]);

    function handleKeepCurrent() {
        persistNow(currentContent.current);
        setExternalContent(null);
    }

    function handleLoadNew() {
        const view = viewRef.current;
        if (view && externalContent !== null) {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: externalContent },
            });

            // No need to touch lastPersistedContent since autosave gets triggered automatically
        }
        setExternalContent(null);
    }

    const extensions = useMemo(
        () => [
            placeholder("Start writing..."),
            wikiLinks({
                suggest: async (query: string) => {
                    const currentDir    = await dirname(filePath);
                    const files         = flattenFiles(fileTree);
                    const lowerQuery    = query.toLowerCase();
                    
                    const matches       = files.filter((f) => f.name.toLowerCase().includes(lowerQuery));

                    return Promise.all(
                        matches.slice(0, 20).map(async (f) => ({
                            target: toRelativePath(currentDir, f.path).replace(/\.md$/, ""),
                            label: f.name,
                        }))
                    );
                },

                resolve: async (target: string) => {
                    const currentDir    = await dirname(filePath);
                    const withExt       = target.endsWith(".md") ? target : `${target}.md`;
                    const absolutePath  = await join(currentDir, withExt);
                    const fileExists    = await exists(absolutePath);

                    return {
                        target,
                        label: target.split("/").pop() ?? target,
                        status: fileExists ? "resolved" : "missing",
                    };
                },

                onOpen: async (target: string) => {
                    const currentDir    = await dirname(filePath);
                    const withExt       = target.endsWith(".md") ? target : `${target}.md`;
                    const absolutePath  = await join(currentDir, withExt);
                    
                    onOpenFile(absolutePath);
                },
            }),
            stylizedCodeBlocks,
            extraCallouts,
            setupViewListener((view) => { // hot reload
                viewRef.current = view;
            }),
        ],
        [filePath, fileTree]
    );

    if (initialContent === null) {
        return (
            <div className="h-full flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
                Loading...
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {externalContent !== null && (
                <div className="flex items-center justify-between px-4 py-2" style={{ background: "var(--color-warning)", color: "#1a1a1e" }}>
                    <span style={{ fontSize: 13 }}>This file changed its contents outside of the editor.</span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleKeepCurrent}
                            className="cursor-pointer border-none"
                            style={{
                                padding: "4px 10px",
                                borderRadius: 4,
                                fontSize: 12,
                                background: "rgba(0,0,0,0.15)",
                            }}
                        >
                            Keep this version
                        </button>

                        <button
                            onClick={handleLoadNew}
                            className="cursor-pointer border-none"
                            style={{
                                padding: "4px 10px",
                                borderRadius: 4,
                                fontSize: 12,
                                background: "rgba(0,0,0,0.15)",
                            }}
                        >
                            Load the new version
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-hidden">
                <AtomicCodeMirrorEditor
                    key={filePath}
                    markdownSource={initialContent}
                    onMarkdownChange={handleChange}
                    extensions={extensions}
                    codeLanguages={ATOMIC_CODE_LANGUAGES}
                />
            </div>
        </div>
    );
}