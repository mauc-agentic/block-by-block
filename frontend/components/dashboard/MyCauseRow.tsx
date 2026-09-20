"use client";

import { useState } from "react";
import type { DashboardCause } from "@/lib/auth";
import { BlockMeter } from "@/components/BlockMeter";
import { Modal } from "@/components/Modal";
import { CauseStatusBadge } from "./CauseStatusBadge";

// UC-011: fila de una causa propia del receptor. El monto recaudado real
// depende de UC-014 (aún Draft), por eso se muestra 0 hasta que exista.
export function MyCauseRow({ cause }: { cause: DashboardCause }) {
  const [showVerdict, setShowVerdict] = useState(false);
  const isRejected = cause.status === "Rejected";
  const hasVerdict = (cause.status === "Verified" || isRejected) && Boolean(cause.verification_reason);

  return (
    <article className="flex flex-col gap-3 border border-line bg-paper-raised p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-lg font-semibold text-ink">
            {cause.title}
          </h3>
          <CauseStatusBadge status={cause.status} />
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-ink-soft">
          {cause.description}
        </p>
        {hasVerdict && (
          <button
            type="button"
            onClick={() => setShowVerdict(true)}
            className="mt-1 text-xs font-medium text-emerald hover:underline"
          >
            {isRejected ? "Ver por qué se rechazó" : "Ver motivo de la IA"}
          </button>
        )}
      </div>
      <div className="w-full shrink-0 sm:w-56">
        <BlockMeter collected={0} target={Number(cause.target_amount)} />
      </div>

      {showVerdict && (
        <Modal
          title={isRejected ? "Por qué se rechazó tu causa" : "Veredicto de la IA"}
          onClose={() => setShowVerdict(false)}
        >
          <div className="flex flex-col gap-3">
            <CauseStatusBadge status={cause.status} />
            <p className="text-sm text-ink">{cause.verification_reason}</p>
            {cause.verification_confidence != null && (
              <p className="text-xs text-ink-soft">
                Confianza del modelo: {Math.round(Number(cause.verification_confidence) * 100)}%
              </p>
            )}
            {isRejected && (
              <p className="text-xs text-ink-soft">
                Puedes crear una nueva causa con una foto que muestre la necesidad con más claridad.
              </p>
            )}
          </div>
        </Modal>
      )}
    </article>
  );
}
