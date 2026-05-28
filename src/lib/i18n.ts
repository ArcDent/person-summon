"use client";
import { createContext, useContext } from "react";
import zh from "@/i18n/zh.json";

export type Locale = "zh" | "en";
type TranslationMap = typeof zh;


export function loadTranslations(locale: Locale): TranslationMap {
  switch (locale) {
    case "en": return require("@/i18n/en.json") as TranslationMap;
    default: return zh;
  }
}

import type { Theme } from "@/components/I18nLayout";

export const I18nContext = createContext<{
  t: TranslationMap; locale: Locale; setLocale: (l: Locale) => void;
  theme: Theme; toggleTheme: () => void;
}>({
  t: zh, locale: "zh", setLocale: () => {},
  theme: "light", toggleTheme: () => {},
});

export function useI18n() { return useContext(I18nContext); }
