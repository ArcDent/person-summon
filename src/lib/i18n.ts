"use client";
import { createContext, useContext } from "react";
import zh from "@/i18n/zh.json";

export type Locale = "zh" | "en" | "ja";
type TranslationMap = typeof zh;
type TranslationKey = keyof TranslationMap;

export function loadTranslations(locale: Locale): TranslationMap {
  switch (locale) {
    case "en": return require("@/i18n/en.json") as TranslationMap;
    case "ja": return require("@/i18n/ja.json") as TranslationMap;
    default: return zh;
  }
}

export const I18nContext = createContext<{ t: TranslationMap; locale: Locale; setLocale: (l: Locale) => void }>({
  t: zh, locale: "zh", setLocale: () => {},
});

export function useI18n() { return useContext(I18nContext); }
