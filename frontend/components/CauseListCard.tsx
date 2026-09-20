import Link from "next/link";
import { CauseProgress } from "@/components/CauseProgress";
import { imageSrc, type CauseListItem } from "@/lib/api";

// UC-007: tarjeta de una causa verificada (S1 y landing).
export function CauseListCard({ cause }: { cause: CauseListItem }) {
  const src = imageSrc(cause.image_url);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-paper-raised">
      <div className="relative aspect-[4/3] overflow-hidden border-b border-line bg-line/30">
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- la evidencia la sirve la API, no un origen conocido para next/image
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        )}
        <span className="absolute top-3 left-3 rounded-full bg-moss px-2.5 py-1 text-xs font-medium text-paper">
          Verificada
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="font-display text-xl leading-tight font-semibold text-ink">{cause.title}</h3>
          <p className="mt-1 text-sm text-ink-soft">{cause.recipient_name}</p>
        </div>
        <p className="line-clamp-2 text-sm text-ink-soft">{cause.description}</p>
        <div className="mt-auto flex flex-col gap-3 pt-2">
          <CauseProgress collected={cause.collected} target={cause.target_amount} />
          <Link
            href={`/cause/${cause.id}`}
            className="self-start bg-blueprint px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-blueprint-dark"
          >
            Ver causa
          </Link>
        </div>
      </div>
    </article>
  );
}
