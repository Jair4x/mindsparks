//
// The editor for the markdown tool
//
// Uses milkdown as the library for it.
//

import { useEffect, useRef, useState, useMemo } from "react";
import { readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";
import { dirname, join } from "@tauri-apps/api/path";
import { flattenFiles, type MarkdownFileNode } from "../../../lib/tools/markdown/markdownFileTree";
import { toRelativePath } from "../../../lib/tools/markdown/relativePath";

import { ATOMIC_CODE_LANGUAGES } from "@atomic-editor/editor/code-languages";
import { AtomicCodeMirrorEditor, wikiLinks } from "@atomic-editor/editor";
import '@atomic-editor/editor/styles.css';
import '../styles/MarkdownEditor.css';

import { stylizedCodeBlocks } from "../../../lib/tools/markdown/stylizedCodeBlocks";
import { extraCallouts } from "../../../lib/tools/markdown/extraCallouts";
import { placeholder } from "@codemirror/view";

interface MarkdownEditorProps {
    filePath:   string;
    fileTree:   MarkdownFileNode[];
    onOpenFile: (path: string) => void;
}

const SAVE_DEBOUNCE_MS = 500;

export function MarkdownEditor({ filePath, fileTree, onOpenFile }: MarkdownEditorProps) {
    const [initialContent, setInitialContent]   = useState<string | null>(null);
    const saveTimeout                           = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingContent                        = useRef<string | null>(null); // last unsaved changes
    
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

    function flushPendingSave() {
        if (pendingContent.current === null) return;

        const content = pendingContent.current;
        pendingContent.current = null;

        writeTextFile(filePath, content).catch((e) =>
            console.error("Couldn't save markdown file: ", e)
        );
    }

    function handleChange(markdown: string) {
        pendingContent.current = markdown;

        if (saveTimeout.current) clearTimeout(saveTimeout.current);

        saveTimeout.current = setTimeout(() => {
            saveTimeout.current = null;
            flushPendingSave();
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
            }
            flushPendingSave();
        };
    }, []);

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
        <div className="h-full">
            <AtomicCodeMirrorEditor
                key={filePath}
                markdownSource={initialContent}
                onMarkdownChange={handleChange}
                extensions={extensions}
                codeLanguages={ATOMIC_CODE_LANGUAGES}
            />
        </div>
    );
}