import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocale } from "../lib/locale";
import { defaultNS, resources } from "./resources";

export const DEFAULT_LOCALE = "en";

export async function initI18n() {
    const savedLocale = await getLocale().catch(() => null);

    await i18n.use(initReactI18next).init({
        resources,
        lng: savedLocale ?? DEFAULT_LOCALE,
        fallbackLng: DEFAULT_LOCALE,
        defaultNS,
        interpolation: { escapeValue: false }, // React already escapes
    });
}