import { invoke } from "@tauri-apps/api/core";

export function getLocale(): Promise<string | null> {
    return invoke<string | null>("get_locale");
}

export function setLocale(locale: string): Promise<void> {
    return invoke<void>("set_locale", { locale });
}
