"use client";
import { useState, useEffect } from "react";
import { I18nContext, loadTranslations, type Locale } from "@/lib/i18n";

export type Theme = "light" | "dark";

export function I18nLayout({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("zh");
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale;
    if (savedLocale && ["zh", "en", "ja"].includes(savedLocale)) {
      setLocale(savedLocale);
    }
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const handleSetLocale = (l: Locale) => {
    setLocale(l);
    localStorage.setItem("locale", l);
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      if (next === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return next;
    });
  };

  return (
    <I18nContext.Provider
      value={{ t: loadTranslations(locale), locale, setLocale: handleSetLocale, theme, toggleTheme }}
    >
      {children}
    </I18nContext.Provider>
  );
}
