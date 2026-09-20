import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import es from "./i18n/es.json";
import en from "./i18n/en.json";

export type Lang = "es" | "en";

export type Dictionary = typeof es;

const dictionaries: Record<Lang, Dictionary> = { es, en: en as Dictionary };

const STORAGE_KEY = "cc-lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dictionary;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "es",
  setLang: () => undefined,
  t: es,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<Lang>("es");

  // Restore the visitor's choice after mount (Spanish stays the default).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "es") {
        setLangState(stored);
      }
    } catch {
      // localStorage unavailable; keep the default.
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable; the toggle still works for this visit.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, t: dictionaries[lang] }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

/** Pick a _one/_other dictionary pair by count. */
export function plural(
  t: Dictionary,
  base: "bedroom" | "bed" | "bathroom" | "floor",
  count: number
): string {
  const amenities = t.amenities as Record<string, string>;
  return amenities[`${base}_${count === 1 ? "one" : "other"}`];
}

/** Cabin marketing copy keyed by the cabin's Spanish database name. */
export type CabinCopy = {
  name: string;
  tag: string;
  desc: string;
  details: string;
};

export function cabinCopy(t: Dictionary, cabinName: string): CabinCopy | null {
  const copy = (t.cabinCopy as Record<string, CabinCopy>)[cabinName];
  return copy ?? null;
}
