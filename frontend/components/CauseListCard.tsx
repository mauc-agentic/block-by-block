"use client";

import Link from "next/link";
import { CauseProgress } from "@/components/CauseProgress";
import { imageSrc, type CauseListItem } from "@/lib/api";
import { useT } from "@/lib/i18n";

// UC-007: tarjeta de una causa verificada (S1 y landing).
export function CauseListCard({ cause }: { cause: CauseListItem }) {
  const { t } = useT();
  const src = imageSrc(cause.image_url);
  return (
    <article className="card-hover flex flex-col overflow-hidden rounded-lg border border-edge bg-surface">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-edge bg-edge/30">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- la evidencia la sirve la API, no un origen conocido para next/image
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-ok px-2.5 py-1 text-xs font-medium text-canvas">
          {t("cause.verifiedBadge")}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-xl leading-tight font-semibold text-fg">{cause.title}</h3>
          <p className="mt-1 text-sm text-fg-soft">{cause.recipient_name}</p>
        </div>
        <p className="line-clamp-2 text-sm text-fg-soft">{cause.description}</p>
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <CauseProgress collected={cause.collected} target={cause.target_amount} />
          <Link
            href={`/cause/${cause.id}`}
            className="self-start bg-eag-gradient rounded-sm px-4 py-2 text-sm font-medium text-canvas transition-colors hover:brightness-110"
          >
            {t("cause.view")}
          </Link>
        </div>
      </div>
    </article>
  );
}
