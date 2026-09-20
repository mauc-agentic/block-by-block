"use client";

// UC-014 A5 / FR-025: recupera las donaciones firmadas que no llegaron a registrarse.

import { useCallback, useEffect, useState } from "react";
import { getStoredToken } from "@/lib/auth";
import { formatUsdt } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { listPending, registerPending, type PendingDonation } from "@/lib/pendingDonations";

export function PendingDonationsNotice({ onRegistered }: { onRegistered?: () => void }) {
  const { t } = useT();
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
    <div role="status" className="border border-danger/40 bg-danger/10 p-4 rounded-lg">
      <p className="text-sm font-medium text-fg">{t("pending.title")}</p>
      <ul className="mt-1 text-sm text-fg-soft">
        {items.map((item) => (
          <li key={item.txHash}>
            {t("pending.item", { amount: formatUsdt(item.amount), id: item.causeId })}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={() => void registerAll(items)}
        className="mt-3 border border-danger/50 px-3 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-60 rounded-sm"
      >
        {busy ? t("pending.busy") : t("pending.now")}
      </button>
    </div>
  );
}
