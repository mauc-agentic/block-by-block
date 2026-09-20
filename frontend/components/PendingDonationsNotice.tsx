"use client";

// UC-014 A5 / FR-025: recupera las donaciones firmadas que no llegaron a registrarse.

import { useCallback, useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth";
import { formatUsdt } from "@/lib/format";
import { listPending, registerPending, type PendingDonation } from "@/lib/pendingDonations";

export function PendingDonationsNotice({ onRegistered }: { onRegistered?: () => void }) {
  const [items, setItems] = useState<PendingDonation[]>([]);
  const [busy, setBusy] = useState(false);

  const registerAll = useCallback(
    async (list: PendingDonation[]) => {
      setBusy(true);
      let any = false;
      for (const item of list) {
        if (await registerPending(item)) any = true;
      }
      setItems(listPending());
      setBusy(false);
      if (any) onRegistered?.();
    },
    [onRegistered]
  );

  useEffect(() => {
    if (!getStoredToken()) return;
    const pending = listPending();
    if (pending.length === 0) return;
    // Un intento automático al cargar; si falla, queda el botón.
    void Promise.resolve().then(() => {
      setItems(pending);
      return registerAll(pending);
    });
  }, [registerAll]);

  if (items.length === 0) return null;

  return (
    <div role="status" className="border border-brick/40 bg-brick/10 p-4">
      <p className="text-sm font-medium text-ink">Tienes una donación pendiente de registrar</p>
      <ul className="mt-1 text-sm text-ink-soft">
        {items.map((item) => (
          <li key={item.txHash}>
            {formatUsdt(item.amount)} a la causa #{item.causeId}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={() => void registerAll(items)}
        className="mt-3 border border-brick/50 px-3 py-1 text-xs font-medium text-brick hover:bg-brick/10 disabled:opacity-60"
      >
        {busy ? "Registrando…" : "Registrar ahora"}
      </button>
    </div>
  );
}
