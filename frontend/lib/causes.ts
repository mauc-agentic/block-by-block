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
  image_hash: string | null;
  target_amount: string | number;
  collected: string | number;
  status: "Verified";
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// UC-007: lista pública de causas verificadas disponibles para donar.
export async function fetchVerifiedCauses(): Promise<VerifiedCause[]> {
  const res = await fetch(`${API_URL}/causes`);
  if (!res.ok) {
    throw new Error("No se pudieron cargar las causas verificadas.");
  }
  return res.json();
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
