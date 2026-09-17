//
// Maps the custom callout styles inside Block Quotes.
//  Implementation is in ./extraCallouts.ts
//
// How does it work?
//  When creating a block quote (>), you can start the quote with a symbol and a title, like {!!Warning}
//  and the editor will change the color of the whole block, and add an icon and title to it.
//

import { TriangleAlert, OctagonAlert, CircleHelp, Info, type LucideIcon } from "lucide-react";

export interface CalloutStyle {
    icon:   LucideIcon;
    color:  string;
}

// Known symbols
export const calloutStyles: Record<string, CalloutStyle> = {
    "!":    { icon: TriangleAlert, color: "var(--color-warning)" },
    "!!":   { icon: OctagonAlert, color: "var(--color-danger)" },
    "?":    { icon: CircleHelp, color: "var(--color-success)" }, // Clarifications, hence the green
}

export const defaultCalloutStyle: CalloutStyle = { icon: Info, color: "var(--color-info)" };

export interface ParsedCallout {
    style:          CalloutStyle;
    symbolLength:   number;
    title:          string;
    fullLength:     number;
}

export function parseCallout(lineContent: string): ParsedCallout | null {
    const match = lineContent.match(/^\{([^}]*)\}/); // {whatever}
    if (!match) return null;

    const inner         = match[1];
    const fullLength    = match[0].length;
    
    const symbolsByLength = Object.keys(calloutStyles).sort((a, b) => b.length - a.length);

    for (const symbol of symbolsByLength) {
        if (inner.startsWith(symbol)) {
            return {
                style: calloutStyles[symbol],
                symbolLength: symbol.length,
                title: inner.slice(symbol.length),
                fullLength,
            };
        }
    }

    return { style: defaultCalloutStyle, symbolLength: 0, title: inner, fullLength };
}