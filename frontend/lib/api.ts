// S6: cliente único de la API (frontend_spec §3.1). Antepone la URL base,
// agrega el JWT, convierte los errores en ApiError y traduce `detail` a un
// mensaje para la persona (§7). Los tipos reflejan docs/api_contract.md.

import { clearSession, getStoredToken } from "@/lib/auth";

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

// §7: tabla `detail` de la API -> mensaje en español.
const DETAIL_MESSAGES: Record<string, string> = {
  "Link a wallet first": "Vincula tu wallet para continuar.",
  "Only verified causes": "Esta causa ya no recibe donaciones.",
  "Amount > 0": "Escribe un monto válido.",
  "Transaction not confirmed or not a donation": "Aún no vemos tu transacción; seguimos intentando…",
  "Transaction not confirmed or not a cause creation": "Aún no vemos tu transacción; seguimos intentando…",
  "Transaction does not match this cause and wallet":
    "Esa transacción no salió de la wallet vinculada a tu cuenta. Cambia a esa cuenta en Rabby.",
  "Transaction already registered": "Esta donación ya estaba registrada.",
  "Cause already published on-chain": "Tu causa ya estaba publicada; seguimos con la foto.",
  "Verification already in progress": "Ya estamos verificando tu causa.",
  "Can only verify Pending causes": "Esta causa ya tiene resultado.",
  "Publish the cause on-chain first": "Antes debes publicar la causa.",
  "Upload evidence first": "Antes debes subir la foto.",
  "No funds to withdraw": "No hay fondos para retirar.",
  "Only the cause owner can do this": "Solo el titular de la causa puede hacerlo.",
  "Cause not found": "Esta causa no existe.",
  "Image > 5 MB": "La foto debe ser JPG o PNG de hasta 5 MB.",
  "Only JPEG and PNG allowed": "La foto debe ser JPG o PNG de hasta 5 MB.",
};

export function mapApiError(status: number, detail: unknown): string {
  if (status === 401 || status === 403) {
    if (typeof detail === "string" && DETAIL_MESSAGES[detail]) return DETAIL_MESSAGES[detail];
    return "Tu sesión expiró. Inicia sesión de nuevo.";
  }
  if (status === 422) return "Escribe un monto válido.";
  if (typeof detail === "string" && DETAIL_MESSAGES[detail]) return DETAIL_MESSAGES[detail];
  if (status === 404) return "Esta causa no existe.";
  if (status === 413) return DETAIL_MESSAGES["Image > 5 MB"];
  if (status >= 500) return "El servidor está despertando; reintentamos en unos segundos.";
  return typeof detail === "string" && detail ? detail : "Algo salió mal. Intenta de nuevo.";
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
      throw new ApiError(0, null, "El servidor está despertando; reintentamos en unos segundos.");
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
