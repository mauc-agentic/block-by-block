import type { DashboardCause } from "@/lib/auth";
import { BlockMeter } from "@/components/BlockMeter";
import { CauseStatusBadge } from "./CauseStatusBadge";

// UC-011: fila de una causa propia del receptor. El monto recaudado real
// depende de UC-014 (aún Draft), por eso se muestra 0 hasta que exista.
export function MyCauseRow({ cause }: { cause: DashboardCause }) {
  return (
    <article className="flex flex-col gap-3 border border-line bg-paper-raised p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-lg font-semibold text-ink">
            {cause.title}
          </h3>
          <CauseStatusBadge status={cause.status} />
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-ink-soft">
          {cause.description}
        </p>
      </div>
      <div className="w-full shrink-0 sm:w-56">
        <BlockMeter collected={0} target={Number(cause.target_amount)} />
      </div>
    </article>
  );
}
