"use client";

// UC-007: Explorar causas verificadas (S1). Lista pública, solo estado Verified (BR-001).

import { useCallback, useEffect, useMemo, useState } from "react";
import { CauseListCard } from "@/components/CauseListCard";
import { listVerifiedCauses, type CauseListItem } from "@/lib/api";
import { useT } from "@/lib/i18n";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function CausesPage() {
  const { t } = useT();
  const [causes, setCauses] = useState<CauseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(() => {
    listVerifiedCauses()
      .then(setCauses)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setError(null);
    setCauses(null);
    load();
  }

  // Filtro por nombre (título o receptor), sin acentos ni mayúsculas (Carlos Andres, UC-007).
  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!causes || !needle) return causes;
    return causes.filter((c) => normalize(c.title).includes(needle) || normalize(c.recipient_name).includes(needle));
  }, [causes, query]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        {t("causes.title")}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-fg-soft">
        {t("causes.leadShort")}
      </p>

      <div className="mt-6 w-full sm:w-72">
        <label htmlFor="causes-search" className="sr-only">
          {t("causes.searchLabel")}
        </label>
        <input
          id="causes-search"
          type="search"
          placeholder={t("causes.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
        />
      </div>

      {error ? (
        <div className="mt-8">
          <p className="text-sm text-danger">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 border border-edge px-4 py-2 text-sm font-medium text-fg-soft hover:border-fg-soft hover:text-fg rounded-sm"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : causes === null ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("causes.loadingAria")}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl border border-edge bg-edge/30" />
          ))}
        </div>
      ) : causes.length === 0 ? (
        <p className="mt-8 border border-dashed border-edge p-8 text-center text-sm text-fg-soft rounded-lg">
          {t("causes.empty")}
        </p>
      ) : filtered && filtered.length === 0 ? (
        <p className="mt-8 text-sm text-fg-soft">{t("causes.noMatch")}</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(filtered ?? causes).map((cause) => (
            <CauseListCard key={cause.id} cause={cause} />
          ))}
        </div>
      )}
    </section>
  );
}
