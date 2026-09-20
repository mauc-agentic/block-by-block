"use client";

// UC-007: Explorar causas verificadas. Misma sección que #causas en la
// landing, en su propia ruta, con un filtro por nombre (no hay categoría ni
// tag todavía, así que buscar por título/receptor es el único filtro útil).

import { useEffect, useMemo, useState } from "react";
import { loadDisplayCauses, type Cause } from "@/lib/causes";
import { CauseCard } from "@/components/CauseCard";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export default function CausesPage() {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadDisplayCauses()
      .then(setCauses)
      .finally(() => setLoading(false));
  }, []);

  const filteredCauses = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return causes;
    return causes.filter(
      (cause) =>
        normalize(cause.title).includes(needle) ||
        normalize(cause.recipientName).includes(needle)
    );
  }, [causes, query]);

  return (
    <section className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Causas verificadas
            </h1>
            <p className="mt-3 max-w-lg text-ink-soft">
              Cada causa pasó por verificación de IA antes de poder recibir
              donaciones. El avance que ves viene directo del contrato.
            </p>
          </div>
          <div className="w-full sm:w-72">
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
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-ink-soft">Cargando causas…</p>
        ) : filteredCauses.length === 0 ? (
          <p className="mt-10 text-sm text-ink-soft">
            {causes.length === 0
              ? "Todavía no hay causas verificadas disponibles."
              : "Ninguna causa coincide con tu búsqueda."}
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCauses.map((cause) => (
              <CauseCard key={cause.id} cause={cause} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
