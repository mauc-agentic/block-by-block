import Link from "next/link";
import { listVerifiedCauses, type CauseListItem } from "@/lib/api";
import { CauseListCard } from "./CauseListCard";

// UC-007 A1: solo causas verificadas reales; sin ninguna, se muestra el mensaje
// de vacío, nunca causas de ejemplo (D2, GAP-041).
async function loadCauses(): Promise<CauseListItem[]> {
  try {
    return (await listVerifiedCauses()).slice(0, 6);
  } catch {
    return [];
  }
}

export async function CausesSection() {
  const causes = await loadCauses();

  return (
    <section id="causas" className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Causas verificadas
            </h2>
            <p className="mt-3 max-w-lg text-ink-soft">
              Cada causa pasó por verificación de IA antes de poder recibir
              donaciones. El avance que ves viene directo del contrato.
            </p>
          </div>
          <Link
            href="/causes"
            className="shrink-0 text-sm font-medium text-blueprint hover:text-blueprint-dark"
          >
            Ver todas las causas
          </Link>
        </div>

        {causes.length === 0 ? (
          <p className="mt-10 border border-dashed border-line p-8 text-center text-sm text-ink-soft">
            Aún no hay causas verificadas.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {causes.map((cause) => (
              <CauseListCard key={cause.id} cause={cause} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
