"use client";

import { useT, type Lang } from "@/lib/i18n";

const LANGS: Lang[] = ["es", "en"];

// Selector de idioma ES / EN (se recuerda en localStorage).
export function LanguageSwitcher() {
  const { t, lang, setLang } = useT();
  return (
    <div role="group" aria-label={t("lang.switch")} className="flex overflow-hidden rounded-lg border border-edge text-xs font-medium">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`px-2.5 py-1.5 uppercase transition-colors ${
            lang === code ? "bg-eag-primary/20 text-eag-secondary" : "text-fg-soft hover:text-fg"
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
