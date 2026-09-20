"use client";

// UC-007: Explorar causas verificadas (S1). Lista pública, solo estado Verified (BR-001).

import { useCallback, useEffect, useMemo, useState } from "react";
import { CauseListCard } from "@/components/CauseListCard";
import { listVerifiedCauses, type CauseListItem } from "@/lib/api";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function CausesPage() {
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
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Causas verificadas
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Cada causa pasó por verificación de IA antes de poder recibir donaciones.
      </p>

      <div className="mt-6 w-full sm:w-72">
        <label htmlFor="causes-search" className="sr-only">
          Buscar causa por nombre
        </label>
        <input
          id="causes-search"
          type="search"
          placeholder="Buscar por nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blueprint"
        />
      </div>

      {error ? (
        <div className="mt-8">
          <p className="text-sm text-brick">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink hover:text-ink"
          >
            Reintentar
          </button>
        </div>
      ) : causes === null ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando causas">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl border border-line bg-line/30" />
          ))}
        </div>
      ) : causes.length === 0 ? (
        <p className="mt-8 border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          Aún no hay causas verificadas.
        </p>
      ) : filtered && filtered.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">Ninguna causa coincide con tu búsqueda.</p>
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
