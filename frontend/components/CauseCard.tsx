import Link from "next/link";
import type { Cause } from "@/lib/causes";
import { BlockMeter } from "./BlockMeter";

// UC-008 (S1-3): la tarjeta enlaza al detalle de la causa.
export function CauseCard({ cause }: { cause: Cause }) {
  return (
    <Link
      href={`/cause/${cause.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-line bg-paper-raised transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line">
        {/* eslint-disable-next-line @next/next/no-img-element -- mock: reemplazar por next/image cuando existan fotos servidas por el backend */}
        <img
          src={cause.imageUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute top-3 left-3 rounded-full bg-emerald px-2.5 py-1 text-xs font-medium text-white shadow-sm">
          Verificada
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-xl leading-tight font-semibold text-ink">
            {cause.title}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">{cause.recipientName}</p>
        </div>
        <p className="line-clamp-2 text-sm text-ink-soft">
          {cause.description}
        </p>
        <div className="mt-auto pt-2">
          <BlockMeter
            collected={cause.collectedAmount}
            target={cause.targetAmount}
          />
        </div>
      </div>
    </Link>
  );
}
