import React from "react";
import { useLanguage, type Lang } from "../lib/i18n";

const LANGS: Lang[] = ["es", "en"];

/** ES/EN switch from the mockup, driven by the translation dictionary. */
const LanguageToggle: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t.nav.languageLabel}
      className="flex items-center gap-2 font-sans text-xs font-bold tracking-[0.14em]"
    >
      {LANGS.map((code, i) => (
        <React.Fragment key={code}>
          {i > 0 && <span aria-hidden="true">/</span>}
          <button
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={lang === code}
            className={`uppercase transition-opacity ${
              lang === code ? "opacity-100" : "opacity-55 hover:opacity-100"
            }`}
          >
            {code}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default LanguageToggle;
