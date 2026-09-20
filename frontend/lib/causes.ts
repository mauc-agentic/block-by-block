import { t } from "@/lib/i18n";
// UC-004, UC-013 — causa tal como la devuelve POST /causes, GET /causes/{id}
// y las confirmaciones de publicación (CauseResponse en api_contract.md).
export type CauseResponse = {
  id: number;
  recipient_id: number;
  onchain_cause_id: number | null;
  title: string;
  description: string;
  image_hash: string | null;
  target_amount: string | number;
  status: "Pending" | "Verified" | "Rejected" | "Completed";
  verification_hash: string | null;
  verification_reason: string | null; // UC-006: motivo del veredicto del agente IA
  verification_confidence: string | number | null; // UC-006: confianza del veredicto (0.0-1.0)
  created_at: string;
  recipient_name: string | null;
  image_url: string | null;
  collected: string | number;
};

// Instrucción de firma (2.1 en api_contract.md) que entrega POST /causes/{id}/publish.
export type PublishInstruction = {
  status?: string;
  contract: string;
  function?: string;
  params: (string | number)[];
  message: string;
};

// UC-009 — instrucción de firma (2.1) que entrega POST /causes/{id}/donate:
// `donate` en CauseVault, precedido por `approve` del token si hace falta.
export type DonateInstruction = {
  status?: string;
  contract: string;
  function?: string;
  params: (string | number)[];
  message: string;
  approve: {
    contract: string;
    function: string;
    params: (string | number)[];
  } | null;
};

// UC-014 — donación ya registrada (POST /causes/{id}/donations/confirm).
export type DonationRecordResponse = {
  id: number;
  cause_id: number;
  amount: string | number;
  tx_hash: string;
  created_at: string;
  cause_status: "Pending" | "Verified" | "Rejected" | "Completed";
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// La evidencia (GET /causes/{id}/evidence) es una ruta relativa a API_URL.
export function resolveCauseImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return `${API_URL}${imageUrl}`;
}

export class CauseError extends Error {}

// FastAPI devuelve `detail` como string para errores de negocio, pero como
// lista de objetos {msg, loc, ...} para errores 422 de validación de esquema.
function detailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : null))
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join(" ");
  }
  return fallback;
}

async function parseCauseResponse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new CauseError(detailToMessage(data?.detail, fallback));
  }
  return res.json();
}

// UC-004: crea la causa en estado Pending asociada al usuario autenticado.
export async function createCause(
  token: string,
  input: { title: string; description: string; target_amount: string }
): Promise<CauseResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/causes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  } catch {
    throw new CauseError(t("err.network"));
  }
  return parseCauseResponse<CauseResponse>(res, t("create.err.fail"));
}

// UC-013: pide la instrucción de firma de `createCause` para publicar la causa on-chain.
export async function requestPublishInstruction(
  token: string,
  causeId: number
): Promise<PublishInstruction> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/causes/${causeId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new CauseError(t("err.network"));
  }
  return parseCauseResponse<PublishInstruction>(res, t("err.publishPrepare"));
}

// UC-013: confirma la publicación leyendo la transacción en la cadena. El RPC
// de HSK reparte peticiones entre nodos con desfase (api_contract.md 2.2), así
// que reintenta unos segundos antes de mostrar el error (A3).
export async function confirmPublish(
  token: string,
  causeId: number,
  txHash: string
): Promise<CauseResponse> {
  const deadline = Date.now() + 30_000;
  let lastMessage = t("err.publishConfirm");

  while (Date.now() < deadline) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/causes/${causeId}/publish/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tx_hash: txHash }),
      });
    } catch {
      throw new CauseError(t("err.network"));
    }

    if (res.ok) return res.json();

    const data = await res.json().catch(() => null);
    lastMessage = detailToMessage(data?.detail, lastMessage);
    if (res.status !== 400) throw new CauseError(lastMessage);
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  throw new CauseError(lastMessage);
}

// UC-009: pide la instrucción de firma (approve + donate) para donar `amount`
// USDT a una causa Verified. El backend valida monto y wallet vinculada (BR-003, BR-004).
export async function requestDonateInstruction(
  token: string,
  causeId: number,
  amount: string
): Promise<DonateInstruction> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/causes/${causeId}/donate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount }),
    });
  } catch {
    throw new CauseError("No se pudo conectar con el servidor. Intenta de nuevo.");
  }
  return parseCauseResponse<DonateInstruction>(res, "No se pudo preparar la donación.");
}

// UC-014: confirma la donación leyendo la tx en la cadena. Igual que
// confirmPublish, reintenta mientras el RPC no vea la transacción todavía
// (api_contract.md 2.2); es idempotente por tx_hash (A2).
export async function confirmDonation(
  token: string,
  causeId: number,
  txHash: string
): Promise<DonationRecordResponse> {
  const deadline = Date.now() + 30_000;
  let lastMessage = "No se pudo registrar la donación.";

  while (Date.now() < deadline) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/causes/${causeId}/donations/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tx_hash: txHash }),
      });
    } catch {
      throw new CauseError("No se pudo conectar con el servidor. Intenta de nuevo.");
    }

    if (res.ok) return res.json();

    const data = await res.json().catch(() => null);
    lastMessage = detailToMessage(data?.detail, lastMessage);
    if (res.status !== 400) throw new CauseError(lastMessage);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new CauseError(lastMessage);
}

// UC-005: sube la foto de evidencia; el backend encola la verificación (UC-006)
// automáticamente cuando la causa ya está publicada on-chain.
export async function uploadCauseImage(
  token: string,
  causeId: number,
  image: File
): Promise<{ cause_id: number; image_hash: string; status: string }> {
  const form = new FormData();
  form.append("image", image);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/causes/${causeId}/upload-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new CauseError(t("err.network"));
  }
  return parseCauseResponse(res, t("create.stage.upload_failed"));
}
