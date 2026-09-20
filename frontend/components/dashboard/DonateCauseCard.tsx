import type { VerifiedCause } from "@/lib/causes";
import { BlockMeter } from "@/components/BlockMeter";

// UC-007: causa verificada disponible para donar. El detalle/flujo de
// donación (UC-008, UC-009) todavía no tiene ruta en el frontend, así que
// por ahora solo se muestra la información, sin enlace a un 404.
export function DonateCauseCard({ cause }: { cause: VerifiedCause }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-paper-raised p-5">
      <div>
        <span className="rounded-full bg-moss px-2.5 py-1 text-xs font-medium text-paper">
          Verificada
        </span>
        <h3 className="mt-2 font-display text-lg font-semibold text-ink">
          {cause.title}
        </h3>
      </div>
      <p className="line-clamp-2 text-sm text-ink-soft">{cause.description}</p>
      <div className="mt-auto pt-1">
        <BlockMeter
          collected={Number(cause.collected)}
          target={Number(cause.target_amount)}
        />
      </div>
    </article>
  );
}
