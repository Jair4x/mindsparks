import { watch } from "@tauri-apps/plugin-fs";

export function watchFileTree(rootPath: string, onChange: () => void) {
    return watch(rootPath, () => onChange(), { recursive: true, delayMs: 300 });
}
