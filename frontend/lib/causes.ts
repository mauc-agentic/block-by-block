// UC-007 — forma alineada con la respuesta futura de GET /causes (solo status "Verified").
export type Cause = {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  targetAmount: number; // USDT
  collectedAmount: number; // USDT, proviene del contrato (getDonationsForCause)
  status: "Verified";
  recipientName: string;
};

// UC-007 — causa tal como la devuelve GET /causes (solo estado "Verified").
export type VerifiedCause = {
  id: number;
  title: string;
  description: string;
  recipient_name: string;
  image_hash: string | null;
  image_url: string | null;
  target_amount: string | number;
  collected: string | number;
  status: "Verified";
};

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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// La evidencia (GET /causes/{id}/evidence) es una ruta relativa a API_URL.
export function resolveCauseImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  return `${API_URL}${imageUrl}`;
}

// UC-007: lista pública de causas verificadas disponibles para donar.
export async function fetchVerifiedCauses(): Promise<VerifiedCause[]> {
  const res = await fetch(`${API_URL}/causes`);
  if (!res.ok) {
    throw new Error("No se pudieron cargar las causas verificadas.");
  }
  return res.json();
}

// UC-007: adapta una causa real de la API a la forma que consume CauseCard,
// usada mientras no existan causas verificadas (ver featuredCauses debajo).
export function toDisplayCause(verified: VerifiedCause): Cause {
  return {
    id: verified.id,
    title: verified.title,
    description: verified.description,
    imageUrl: resolveCauseImageUrl(verified.image_url) ?? "",
    targetAmount: Number(verified.target_amount),
    collectedAmount: Number(verified.collected),
    status: "Verified",
    recipientName: verified.recipient_name,
  };
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
    throw new CauseError("No se pudo conectar con el servidor. Intenta de nuevo.");
  }
  return parseCauseResponse<CauseResponse>(res, "No se pudo crear la causa.");
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
    throw new CauseError("No se pudo conectar con el servidor. Intenta de nuevo.");
  }
  return parseCauseResponse<PublishInstruction>(res, "No se pudo preparar la publicación.");
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
  let lastMessage = "No se pudo confirmar la publicación.";

  while (Date.now() < deadline) {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/causes/${causeId}/publish/confirm`, {
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
    await new Promise((resolve) => setTimeout(resolve, 2500));
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
    throw new CauseError("No se pudo conectar con el servidor. Intenta de nuevo.");
  }
  return parseCauseResponse(res, "No se pudo subir la evidencia.");
}

export const featuredCauses: Cause[] = [
  {
    id: 1,
    title: "Reparación del techo del comedor comunitario",
    description:
      "El comedor de Aguablanca alimenta a 80 niños al día; la última temporada de lluvias dañó el techo.",
    imageUrl: "https://picsum.photos/seed/comedor-aguablanca/800/600",
    targetAmount: 1200,
    collectedAmount: 860,
    status: "Verified",
    recipientName: "Fundación Comedor Aguablanca",
  },
  {
    id: 2,
    title: "Kit escolar para 30 estudiantes",
    description:
      "Útiles, uniformes y transporte para el semestre de estudiantes de la vereda El Hormiguero.",
    imageUrl: "https://picsum.photos/seed/kit-escolar-hormiguero/800/600",
    targetAmount: 900,
    collectedAmount: 900,
    status: "Verified",
    recipientName: "Escuela Rural El Hormiguero",
  },
  {
    id: 3,
    title: "Silla de ruedas para Don Jairo",
    description:
      "Don Jairo perdió movilidad tras un accidente laboral y necesita una silla de ruedas adecuada.",
    imageUrl: "https://picsum.photos/seed/silla-ruedas-jairo/800/600",
    targetAmount: 650,
    collectedAmount: 210,
    status: "Verified",
    recipientName: "Jairo Sánchez",
  },
];
