//
// Callouts to the style of GitHub/Obsidian:
//  > {!title} header, followed by normal blockquote lines as the body.
//
// The symbol defines the icon and color of the whole block quote. (extensible map on ./calloutStyles.ts).
//  If not recognized, treat as information quotes.
//

import { StateField, type EditorState, type Range } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseCallout } from "./calloutStyles";

class CalloutIconWidget extends WidgetType {
    constructor(readonly icon: ReturnType<typeof parseCallout>["style"]["icon"], readonly color: string) {
        super();
    }

    eq(other: CalloutIconWidget) {
        return other.color === this.color;
    }

    toDOM() {
        const el = document.createElement("span");
        el.className = "callout-icon";
        el.style.color = this.color;
        el.innerHTML = renderToStaticMarkup(createElement(this.icon, { size: 16 }));

        return el;
    }

    ignoreEvent() {
        return true;
    }
}

function buildDecorations(state: EditorState): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    
    function intersectsSelection(from: number, to: number): boolean {
        return state.selection.ranges.some(
            (range) => range.from <= to && range.to >= from
        );
    }

    syntaxTree(state).iterate({
        enter: (node) => {
            if (node.name !== "Blockquote") return;

            const firstLine = state.doc.lineAt(node.from);
            const markerMatch = firstLine.text.match(/^(\s*>\s?)/); // > or > with spaces
            const markerLength = markerMatch ? markerMatch[0].length : 0;
            const contentStart = firstLine.from + markerLength;
            const contentText = firstLine.text.slice(markerLength);
            
            const parsed = parseCallout(contentText);
            if (!parsed) return; // normal blockquote

            const lastLine = state.doc.lineAt(node.to);

            // Paint every line that the blockquote occupies
            for (let lineNum = firstLine.number; lineNum <= lastLine.number; lineNum++) {
                const line = state.doc.line(lineNum);

                decorations.push(
                    Decoration.line({
                        class: "callout-line",
                        attributes: { style: `--callout-color: ${parsed.style.color};` },
                    }).range(line.from)
                );
            }

            const cursorOnFirstLine = intersectsSelection(firstLine.from, firstLine.to);
            if (cursorOnFirstLine) return; // show raw callout to edit it

            const bracketOpenEnd = contentStart + 1 + parsed.symbolLength;
            const titleStart = bracketOpenEnd;
            const titleEnd = titleStart + parsed.title.length;
            const bracketCloseEnd = contentStart + parsed.fullLength;

            decorations.push(
                Decoration.widget({
                    widget: new CalloutIconWidget(parsed.style.icon, parsed.style.color),
                    side: -1,
                }).range(contentStart)
            );

            decorations.push(Decoration.replace({}).range(contentStart, bracketOpenEnd));
            if (titleStart < titleEnd) {
                decorations.push(
                    Decoration.mark({
                        class: "callout-title",
                        attributes: { style: `color: ${parsed.style.color};` },
                    }).range(titleStart, titleEnd)
                );
            }
            decorations.push(Decoration.replace({}).range(titleEnd, bracketCloseEnd));
        }
    });

    return Decoration.set(decorations, true);
}

export const extraCallouts = StateField.define<DecorationSet>({
    create(state) {
        return buildDecorations(state);
    },
    update(decorations, tr) {
        const selectionChanged = !tr.startState.selection.eq(tr.state.selection);
        if (tr.docChanged || selectionChanged) return buildDecorations(tr.state);
        return decorations.map(tr.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
})