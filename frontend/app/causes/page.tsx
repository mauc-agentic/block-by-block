"use client";

// UC-007: Explorar causas verificadas (S1). Lista pública, solo estado Verified (BR-001).

import { useCallback, useEffect, useState } from "react";
import { CauseListCard } from "@/components/CauseListCard";
import { listVerifiedCauses, type CauseListItem } from "@/lib/api";

export default function CausesPage() {
  const [causes, setCauses] = useState<CauseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Causas verificadas
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-soft">
        Cada causa pasó por verificación de IA antes de poder recibir donaciones.
      </p>

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
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {causes.map((cause) => (
            <CauseListCard key={cause.id} cause={cause} />
          ))}
        </div>
      )}
    </section>
  );
}
