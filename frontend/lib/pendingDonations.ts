// S3 / FR-025: donaciones firmadas que aún no se registraron en la plataforma.
// Se guardan ANTES de llamar a `confirm`; así cerrar la pestaña no deja el
// dinero en el contrato y fuera de la plataforma (GAP-034).

import { ApiError, confirmDonation } from "@/lib/api";

const KEY = "bbb_pending_donations";

export type PendingDonation = {
  causeId: number;
  txHash: string;
  amount: string;
  createdAt: string;
};

export function listPending(): PendingDonation[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: PendingDonation[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // sin almacenamiento: se pierde solo la recuperación, no la donación
  }
}

export function savePending(item: PendingDonation) {
  const items = listPending().filter((p) => p.txHash !== item.txHash);
  write([...items, item]);
}

export function removePending(txHash: string) {
  write(listPending().filter((p) => p.txHash !== txHash));
}

/** Reintenta registrar una pendiente; la borra si queda registrada o ya lo estaba. */
export async function registerPending(item: PendingDonation): Promise<boolean> {
  try {
    await confirmDonation(item.causeId, item.txHash);
    removePending(item.txHash);
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) removePending(item.txHash);
    return false;
  }
}
