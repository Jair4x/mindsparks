//
// Shows a title bar above a fenced code block when the user adds
//  title="...", ex. ```jsx title="Card.jsx".
//
// Also hides fence opening/closing both for the ones with title, and the ones without it
//  because it looks like CodeMirror doesn't manage that, or at least, not that I have seen.
//
// Resources used for this:
//  - FencedCode/CodeInfo syntax nodes:
//      documented in https://code.haverbeke.berlin/lezer/markdown
//  - CodeMirror's general pattern of decorations/widgets:
//      https://codemirror.net/examples/decoration/
//
// Inspiration for this:
//  - codemirror-rich-markdoc, by segphault. Didn't use the code btw, only studied it for this (https://github.com/segphault/codemirror-rich-markdoc)
//  - Another project of mine, which uses these kind of title headers for some lectures I made (https://github.com/jair4x/clases-para-la-clase)
//

import { StateField, type EditorState, type Range } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";

const TITLE_PATTERN = /title\s*=\s*"([^"]*)"/; // title="whatever"

class CodeBlockTitleWidget extends WidgetType {
    constructor(readonly title: string, readonly linePos: number) {
        super();
    }

    eq(other: CodeBlockTitleWidget) {
        return other.title === this.title && other.linePos === this.linePos;
    }

    toDOM(view: EditorView) {
        const el = document.createElement("div");
        el.className = "titled-code-block__title";
        el.textContent = this.title || "Untitled";

        // When clicking the title, move the cursor to the actual line
        el.addEventListener("mousedown", (e) => {
            e.preventDefault();
            view.dispatch({ selection: { anchor: this.linePos } });
            view.focus();
        });

        return el;
    }

    ignoreEvent() {
        return true;
    }
}

function buildDecorations(state: EditorState): DecorationSet {
    const widgets: Range<Decoration>[] = [];

    // only added because of DRY
    function intersectsSelection(from: number, to: number): boolean {
        return state.selection.ranges.some(
            (range) => range.from <= to && range.to >= from
        );
    }

    syntaxTree(state).iterate({
        enter: (node) => {
            if (node.name !== "FencedCode") return;

            const infoNode = node.node.getChild("CodeInfo");
            const infoText = infoNode ? state.doc.sliceString(infoNode.from, infoNode.to) : "";
            const titleMatch = infoText.match(TITLE_PATTERN);

            const openingLine = state.doc.lineAt(node.from);
            const closingLine = state.doc.lineAt(node.to);

            const hasClosingFence =
                closingLine.number !== openingLine.number &&
                /^\s*(`{3,}|~{3,})\s*$/.test(closingLine.text); // ``` or ~~~

            if (titleMatch) {
                if (!intersectsSelection(openingLine.from, openingLine.to)) {
                    widgets.push(
                        Decoration.replace({
                            widget: new CodeBlockTitleWidget(titleMatch[1], openingLine.from),
                            block: true,
                        }).range(openingLine.from, openingLine.to)
                    );
                }

                if (hasClosingFence && !intersectsSelection(node.from, node.to)) {
                    widgets.push(
                        Decoration.replace({ block: true }).range(closingLine.from, closingLine.to)
                    );
                }

                return;
            }

            // for the ones that don't have a title or any compatible metadata for that matter
            if (intersectsSelection(node.from, node.to)) return;

            widgets.push(Decoration.replace({ block: true }).range(openingLine.from, openingLine.to));

            if (hasClosingFence) {
                widgets.push(Decoration.replace({ block: true }).range(closingLine.from, closingLine.to));
            }
        },
    });

    return Decoration.set(widgets, true);
}

export const stylizedCodeBlocks = StateField.define<DecorationSet>({
    create(state) {
        return buildDecorations(state);
    },
    update(decorations, tr) {
        const selectionChanged = !tr.startState.selection.eq(tr.state.selection);
        if (tr.docChanged || selectionChanged) return buildDecorations(tr.state);
        return decorations.map(tr.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
});
