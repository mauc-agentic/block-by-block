import Link from "next/link";
import type { VerifiedCause } from "@/lib/causes";
import { BlockMeter } from "@/components/BlockMeter";

// UC-007: causa verificada disponible para donar; enlaza al detalle (UC-008)
// donde vive el bloque de donar (UC-009).
export function DonateCauseCard({ cause }: { cause: VerifiedCause }) {
  return (
    <Link
      href={`/cause/${cause.id}`}
      className="flex flex-col gap-3 rounded-xl border border-line bg-paper-raised p-5 transition-shadow hover:shadow-md"
    >
      <div>
        <span className="rounded-full bg-emerald px-2.5 py-1 text-xs font-medium text-paper-raised">
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
    </Link>
  );
}
