"use client";

import { useT } from "@/lib/i18n";

// S6: indicador de pasos de una transacción (pendiente / en curso / hecho / error).

export type StepState = "pending" | "active" | "done" | "error";

const ICON: Record<StepState, string> = { pending: "○", active: "◐", done: "●", error: "✕" };
const STYLE: Record<StepState, string> = {
  pending: "text-fg-soft",
  active: "text-eag-secondary font-medium",
  done: "text-ok",
  error: "text-danger font-medium",
};

export function TxStepper({ steps }: { steps: { label: string; state: StepState }[] }) {
  const { t } = useT();
  return (
    <ol className="flex flex-col gap-1 sm:flex-row sm:gap-6" aria-label={t("tx.progress")}>
      {steps.map((step) => (
        <li key={step.label} data-state={step.state} className={`text-sm ${STYLE[step.state]}`}>
          <span aria-hidden="true">{ICON[step.state]}</span> {step.label}
        </li>
      ))}
    </ol>
  );
}
