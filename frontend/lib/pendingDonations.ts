// UC-009, UC-014, FR-025 — donaciones firmadas pero sin registrar todavía.
// Si el donante cierra la pestaña entre `donate` y `donations/confirm`, el
// dinero ya salió de su wallet pero la plataforma no lo sabe (GAP-034); esto
// guarda el hash antes de registrar para poder reintentarlo al volver.

export type PendingDonation = {
  causeId: number;
  txHash: string;
  amount: string;
  createdAt: string;
};

const STORAGE_KEY = "bbb_pending_donations";

export function getPendingDonations(): PendingDonation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingDonation[]) : [];
  } catch {
    return [];
  }
}

export function getPendingDonationsForCause(causeId: number): PendingDonation[] {
  return getPendingDonations().filter((p) => p.causeId === causeId);
}

export function addPendingDonation(entry: PendingDonation) {
  try {
    const rest = getPendingDonations().filter((p) => p.txHash !== entry.txHash);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...rest, entry]));
  } catch {
    // localStorage no disponible (modo privado): no bloquea el flujo, solo se
    // pierde la recuperación si se cierra la pestaña antes de registrar.
  }
}

export function removePendingDonation(txHash: string) {
  try {
    const rest = getPendingDonations().filter((p) => p.txHash !== txHash);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    // no-op
  }
}
