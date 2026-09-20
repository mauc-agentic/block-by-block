"use client";

import { formatUsdt, percentOf } from "@/lib/format";
import { useT } from "@/lib/i18n";

// Avance `collected / target` con los montos exactos (S1, S2, S4).
export function CauseProgress({ collected, target }: { collected: string; target: string }) {
  const { t } = useT();
  const percent = percentOf(collected, target);
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={Math.min(percent, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-edge"
      >
        <div className="bg-eag-gradient h-full rounded-full" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className="mt-2 font-mono text-xs text-fg-soft">
        {t("progress.of", { collected: formatUsdt(collected), target: formatUsdt(target), percent })}
      </p>
    </div>
  );
}
