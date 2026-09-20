"use client";

// i18n ligero (ES por defecto, EN): un almacén de módulo que sirve tanto a componentes
// (`useT`, se vuelven a renderizar al cambiar de idioma) como a `lib/` (`t`, al lanzar errores).

import { useSyncExternalStore } from "react";
import { en } from "./en";
import { es, type MessageKey } from "./es";

export type Lang = "es" | "en";
export type { MessageKey };

const STORAGE_KEY = "bbb_lang";
const dictionaries: Record<Lang, Record<MessageKey, string>> = { es, en };
const listeners = new Set<() => void>();

let current: Lang = "es";
let loaded = false;

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") current = stored;
  } catch {
    // sin almacenamiento: se queda en español
  }
  document.documentElement.lang = current;
}

export function getLang(): Lang {
  ensureLoaded();
  return current;
}

export function setLang(lang: Lang) {
  ensureLoaded();
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // no-op
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((listener) => listener());
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const text = dictionaries[getLang()][key] ?? es[key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Hook: devuelve `t` ligado al idioma actual y se vuelve a renderizar al cambiarlo. */
export function useT() {
  const lang = useSyncExternalStore(subscribe, getLang, () => "es" as Lang);
  return { lang, t, setLang };
}
