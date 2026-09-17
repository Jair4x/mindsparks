//
// Captures the real instance of EditorView using the standard pattern of CM6
//  (updateListener), given that atomic-editor doesn't expose one direct ref to the view on its own
//

import { EditorView } from "@codemirror/view";

export function setupViewListener(onReady: (view: EditorView) => void) {
    return EditorView.updateListener.of((update) => onReady(update.view));
}
