// S6: indicador de pasos de una transacción (pendiente / en curso / hecho / error).

export type StepState = "pending" | "active" | "done" | "error";

const ICON: Record<StepState, string> = { pending: "○", active: "◐", done: "●", error: "✕" };
const STYLE: Record<StepState, string> = {
  pending: "text-ink-soft",
  active: "text-blueprint font-medium",
  done: "text-moss",
  error: "text-brick font-medium",
};

export function TxStepper({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <ol className="flex flex-col gap-1 sm:flex-row sm:gap-6" aria-label="Progreso de la transacción">
      {steps.map((step) => (
        <li key={step.label} data-state={step.state} className={`text-sm ${STYLE[step.state]}`}>
          <span aria-hidden="true">{ICON[step.state]}</span> {step.label}
        </li>
      ))}
    </ol>
  );
}
