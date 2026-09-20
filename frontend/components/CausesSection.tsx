import Link from "next/link";
import { fetchVerifiedCauses, featuredCauses, toDisplayCause, type Cause } from "@/lib/causes";
import { CauseCard } from "./CauseCard";

// UC-007: causas verificadas reales; mientras no exista ninguna, se muestran
// las causas de muestra (featuredCauses) para no dejar la sección vacía.
async function loadCauses(): Promise<Cause[]> {
  try {
    const verified = await fetchVerifiedCauses();
    if (verified.length > 0) return verified.map(toDisplayCause);
  } catch {
    // Backend no disponible: se cae al listado de muestra.
  }
  return featuredCauses;
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

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {causes.map((cause) => (
            <CauseCard key={cause.id} cause={cause} />
          ))}
        </div>
      </div>
    </section>
  );
}
