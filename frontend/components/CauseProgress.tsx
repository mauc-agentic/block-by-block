import { formatUsdt, percentOf } from "@/lib/format";

// Avance `collected / target` con los montos exactos (S1, S2, S4).
export function CauseProgress({ collected, target }: { collected: string; target: string }) {
  const percent = percentOf(collected, target);
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={Math.min(percent, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-3 w-full bg-line/60"
      >
        <div className="h-full bg-brick" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className="mt-2 font-mono text-sm text-ink-soft">
        {formatUsdt(collected)} de {formatUsdt(target)} ({percent} %)
      </p>
    </div>
  );
}
