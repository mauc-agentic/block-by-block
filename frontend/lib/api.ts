// S6: cliente único de la API (frontend_spec §3.1). Antepone la URL base,
// agrega el JWT, convierte los errores en ApiError y traduce `detail` a un
// mensaje para la persona (§7). Los tipos reflejan docs/api_contract.md.

import { clearSession, getStoredToken } from "@/lib/auth";
import { t, type MessageKey } from "@/lib/i18n";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type CauseStatus = "Pending" | "Verified" | "Rejected" | "Completed";

export type DonationItem = {
  amount: string;
  tx_hash: string;
  donor_wallet: string | null;
  created_at: string;
};

export type CauseDetail = {
  id: number;
  recipient_id: number;
  onchain_cause_id: number | null;
  title: string;
  description: string;
  image_hash: string | null;
  target_amount: string;
  status: CauseStatus;
  verification_hash: string | null;
  verification_reason: string | null;
  verification_confidence: string | number | null;
  created_at: string;
  recipient_name: string | null;
  image_url: string | null;
  collected: string;
  donations: DonationItem[];
};

export type CauseListItem = {
  id: number;
  title: string;
  description: string;
  recipient_name: string;
  image_hash: string | null;
  image_url: string | null;
  target_amount: string;
  collected: string;
  status: CauseStatus;
};

export type SignInstruction = {
  status: string;
  contract: string;
  function: string;
  params: (string | number)[];
  message: string;
  approve?: { contract: string; function: string; params: (string | number)[] } | null;
  amount?: string | null;
  to_wallet?: string;
};

export type DonationRecord = {
  id: number;
  cause_id: number;
  amount: string;
  tx_hash: string;
  created_at: string;
  cause_status: string;
};

export type DonorDonation = {
  cause_id: number;
  cause_title: string;
  amount: string;
  tx_hash: string;
  created_at: string;
};

export type DashboardCauseFull = CauseDetail & { available_to_withdraw: string | null };

export type Dashboard = {
  user: {
    id: number;
    username: string;
    email: string;
    auth_provider: string;
    wallet_address: string | null;
    created_at: string;
  };
  wallet_linked: boolean;
  causes: DashboardCauseFull[];
  total_donated: string;
  donations: DonorDonation[];
};

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
  get sessionExpired() {
    return this.status === 401 || (this.status === 403 && this.detail !== "Only the cause owner can do this");
  }
  get notConfirmedYet() {
    return (
      this.status === 400 &&
      typeof this.detail === "string" &&
      this.detail.startsWith("Transaction not confirmed")
    );
  }
}

// §7: tabla `detail` de la API -> clave de mensaje (se traduce con el idioma activo).
const DETAIL_KEYS: Record<string, MessageKey> = {
  "Link a wallet first": "err.linkWallet",
  "Only verified causes": "err.onlyVerified",
  "Amount > 0": "err.amount",
  "Transaction not confirmed or not a donation": "err.notConfirmed",
  "Transaction not confirmed or not a cause creation": "err.notConfirmed",
  "Transaction does not match this cause and wallet": "err.txMismatch",
  "Transaction already registered": "err.alreadyRegistered",
  "Cause already published on-chain": "err.alreadyPublished",
  "Verification already in progress": "err.verifyRunning",
  "Can only verify Pending causes": "err.notPending",
  "Publish the cause on-chain first": "err.publishFirst",
  "Upload evidence first": "err.uploadFirst",
  "No funds to withdraw": "err.noFunds",
  "Only the cause owner can do this": "err.ownerOnly",
  "Cause not found": "err.notFound",
  "Image > 5 MB": "err.image",
  "Only JPEG and PNG allowed": "err.image",
};

export function mapApiError(status: number, detail: unknown): string {
  const known = typeof detail === "string" ? DETAIL_KEYS[detail] : undefined;
  if (status === 401 || status === 403) return known ? t(known) : t("err.session");
  if (status === 422) return t("err.amount");
  if (known) return t(known);
  if (status === 404) return t("err.notFound");
  if (status === 413) return t("err.image");
  if (status >= 500) return t("err.sleeping");
  return typeof detail === "string" && detail ? detail : t("err.generic");
}

const SLEEPY_RETRY_MS = 5_000;

type Options = { method?: string; body?: unknown; auth?: boolean };

/** Petición a la API; un fallo de red (servidor dormido) se reintenta una vez a los 5 s. */
export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, SLEEPY_RETRY_MS));
    try {
      res = await fetch(`${API_URL}${path}`, init);
    } catch {
      throw new ApiError(0, null, t("err.sleeping"));
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const err = new ApiError(res.status, data?.detail, mapApiError(res.status, data?.detail));
    if (opts.auth && err.sessionExpired) clearSession();
    throw err;
  }
  return (await res.json()) as T;
}

// --- Endpoints -----------------------------------------------------------

export const listVerifiedCauses = () => apiFetch<CauseListItem[]>("/causes");
export const getCause = (id: number | string) => apiFetch<CauseDetail>(`/causes/${id}`);
export const retryVerification = (id: number) =>
  apiFetch<{ status?: string }>(`/causes/${id}/verify`, { method: "POST", auth: true });
export const requestDonation = (id: number, amount: string) =>
  apiFetch<SignInstruction>(`/causes/${id}/donate`, { method: "POST", auth: true, body: { amount } });
export const requestWithdraw = (id: number) =>
  apiFetch<SignInstruction>(`/causes/${id}/withdraw`, { method: "POST", auth: true });
export const fetchDashboard = () => apiFetch<Dashboard>("/users/me/dashboard", { auth: true });

/** URL absoluta de la evidencia (la API entrega una ruta relativa a la base). */
export function imageSrc(imageUrl: string | null): string | null {
  return imageUrl ? `${API_URL}${imageUrl}` : null;
}

const CONFIRM_INTERVAL_MS = 3_000;
const CONFIRM_TIMEOUT_MS = 30_000;

/**
 * UC-014: registra la donación enviando solo el hash. El RPC tiene nodos
 * desfasados, así que "not confirmed" se reintenta cada 3 s hasta ~30 s.
 * "already registered" (409) cuenta como éxito (idempotente, A2).
 */
export async function confirmDonation(
  causeId: number,
  txHash: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<DonationRecord | null> {
  const interval = opts.intervalMs ?? CONFIRM_INTERVAL_MS;
  const deadline = Date.now() + (opts.timeoutMs ?? CONFIRM_TIMEOUT_MS);
  for (;;) {
    try {
      return await apiFetch<DonationRecord>(`/causes/${causeId}/donations/confirm`, {
        method: "POST",
        auth: true,
        body: { tx_hash: txHash },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) return null;
      if (!(err instanceof ApiError) || !err.notConfirmedYet || Date.now() + interval > deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}
