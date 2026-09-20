// UC-009 S3: indicador de tres pasos (Aprobar USDT → Donar → Registrar) que
// muestra en cuál va la firma en curso.

export function TxStepper({
  steps,
  current,
  failed,
}: {
  steps: string[];
  current: number;
  failed?: boolean;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${
                  active && failed
                    ? "bg-brick text-paper"
                    : done
                      ? "bg-emerald text-paper"
                      : active
                        ? "border border-emerald text-emerald"
                        : "border border-line text-ink-soft"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-xs ${
                  active ? "font-medium text-ink" : done ? "text-ink-soft" : "text-ink-soft/60"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && <span className="h-px w-4 bg-line" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
