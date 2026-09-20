const TOTAL_BLOCKS = 10;

export function BlockMeter({
  collected,
  target,
}: {
  collected: number;
  target: number;
}) {
  const ratio = target > 0 ? Math.min(collected / target, 1) : 0;
  const filledBlocks = Math.round(ratio * TOTAL_BLOCKS);
  const percent = Math.round(ratio * 100);

  return (
    <div>
      <div
        className="flex gap-1"
        role="img"
        aria-label={`${percent}% del objetivo recaudado`}
      >
        {Array.from({ length: TOTAL_BLOCKS }, (_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 ${
              i < filledBlocks ? "bg-brick" : "bg-line/60"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between font-mono text-sm text-ink-soft">
        <span className="text-ink font-medium">
          ${collected.toLocaleString("es-CO")}
        </span>
        <span>de ${target.toLocaleString("es-CO")} USDT</span>
      </div>
    </div>
  );
}
