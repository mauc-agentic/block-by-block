"use client";

// UC-004: Crear causa · UC-005: Subir evidencia · UC-013: Publicar causa on-chain
//
// Flujo: crear la causa (Pending) -> firmar `createCause` con la wallet ->
// confirmar la publicación leyendo la cadena -> subir la foto, que encola la
// verificación automática (UC-006). Cada paso puede reintentarse por
// separado si falla (A3 de UC-004/UC-013, A1 de UC-005).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { getStoredToken, getStoredUser, type AuthUser } from "@/lib/auth";
import {
  CauseError,
  confirmPublish,
  createCause,
  requestPublishInstruction,
  uploadCauseImage,
  type CauseResponse,
} from "@/lib/causes";
import { WalletError, publishCauseOnChain } from "@/lib/wallet";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];

type Stage = "publishing" | "publish_failed" | "uploading" | "upload_failed" | "done";

const STAGE_LABEL: Record<Stage, string> = {
  publishing: "Firma en tu wallet para publicar la causa en el contrato…",
  publish_failed: "No se pudo publicar la causa en la cadena.",
  uploading: "Subiendo tu foto…",
  upload_failed: "No se pudo subir la evidencia.",
  done: "¡Listo!",
};

export default function CreateCausePage() {
  const router = useRouter();
  const [token] = useState(() => getStoredToken());
  const [user] = useState<AuthUser | null>(() => getStoredUser());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [cause, setCause] = useState<CauseResponse | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.replace("/auth/login");
  }, [token, router]);

  if (!token) return null;

  // A2 / A6: sin wallet vinculada no se puede publicar ni verificar la causa.
  if (!user?.wallet_address) {
    return (
      <AuthCard
        title="Vincula tu wallet primero"
        subtitle="Necesitas una wallet vinculada para firmar la publicación de tu causa en el contrato (UC-003)."
      >
        <Link
          href="/wallet"
          className="inline-block bg-emerald px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-emerald-dark"
        >
          Vincular wallet
        </Link>
      </AuthCard>
    );
  }

  async function publishAndUpload(created: CauseResponse, file: File, walletAddress: string) {
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    setStage("publishing");
    setStageError(null);
    let published: CauseResponse;
    try {
      const instruction = await requestPublishInstruction(token, created.id);
      const txHash = await publishCauseOnChain(instruction, walletAddress);
      published = await confirmPublish(token, created.id, txHash);
      setCause(published);
    } catch (err) {
      setStage("publish_failed");
      setStageError(
        err instanceof WalletError || err instanceof CauseError
          ? err.message
          : "No se pudo publicar la causa en la cadena."
      );
      return;
    }

    setStage("uploading");
    try {
      await uploadCauseImage(token, published.id, file);
      setStage("done");
    } catch (err) {
      setStage("upload_failed");
      setStageError(err instanceof CauseError ? err.message : "No se pudo subir la evidencia.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // A1: título, descripción o monto inválidos.
    if (title.trim().length < 5) {
      setFormError("El título debe tener al menos 5 caracteres.");
      return;
    }
    if (description.trim().length < 20) {
      setFormError("La descripción debe tener al menos 20 caracteres.");
      return;
    }
    const amount = Number(targetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("El monto objetivo debe ser mayor que cero."); // BR-002
      return;
    }
    if (!image) {
      setFormError("Sube una foto que respalde tu causa.");
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      setFormError("Solo se aceptan imágenes JPEG o PNG."); // UC-005 BR-002
      return;
    }
    if (image.size > MAX_IMAGE_BYTES) {
      setFormError("La imagen no puede superar 5 MB."); // UC-005 BR-004
      return;
    }

    const walletAddress = user?.wallet_address;
    if (!token || !walletAddress) {
      router.replace("/auth/login");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCause(token, {
        title: title.trim(),
        description: description.trim(),
        target_amount: targetAmount,
      });
      setCause(created);
      await publishAndUpload(created, image, walletAddress);
    } catch (err) {
      setFormError(err instanceof CauseError ? err.message : "No se pudo crear la causa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryPublish() {
    if (!cause || !image || !user?.wallet_address) return;
    await publishAndUpload(cause, image, user.wallet_address);
  }

  async function retryUpload() {
    if (!token || !cause || !image) return;
    setStage("uploading");
    setStageError(null);
    try {
      await uploadCauseImage(token, cause.id, image);
      setStage("done");
    } catch (err) {
      setStage("upload_failed");
      setStageError(err instanceof CauseError ? err.message : "No se pudo subir la evidencia.");
    }
  }

  if (stage === "done") {
    return (
      <AuthCard
        title="Causa enviada a verificación"
        subtitle="Tu causa quedó publicada en el contrato y tu foto está en revisión por IA (UC-006). Te avisamos en tu dashboard en cuanto cambie de estado."
      >
        <Link
          href="/dashboard"
          className="inline-block bg-emerald px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-emerald-dark"
        >
          Ir a mi dashboard
        </Link>
      </AuthCard>
    );
  }

  // Tras crear la causa, el formulario se reemplaza por el estado del flujo
  // de publicación/subida; cada paso se puede reintentar sin duplicar la causa.
  if (cause && stage) {
    return (
      <AuthCard title={cause.title} subtitle="Publicando tu causa">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">{STAGE_LABEL[stage]}</p>

          {stageError && <p className="text-sm text-brick">{stageError}</p>}

          {stage === "publish_failed" && (
            <button
              type="button"
              onClick={retryPublish}
              className="bg-emerald px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-emerald-dark"
            >
              Reintentar publicación
            </button>
          )}

          {stage === "upload_failed" && (
            <button
              type="button"
              onClick={retryUpload}
              className="bg-emerald px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-emerald-dark"
            >
              Reintentar subida de la foto
            </button>
          )}
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Crear causa"
      subtitle="Cuenta la necesidad, súbela con una foto y fírmala con tu wallet para publicarla en el contrato."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase">
            Título
          </label>
          <input
            id="title"
            type="text"
            required
            minLength={5}
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-emerald"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase"
          >
            Descripción
          </label>
          <textarea
            id="description"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-emerald"
          />
          <p className="mt-1 text-xs text-ink-soft">Mínimo 20 caracteres.</p>
        </div>

        <div>
          <label
            htmlFor="target_amount"
            className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase"
          >
            Monto objetivo (USDT)
          </label>
          <input
            id="target_amount"
            type="number"
            min="0.000001"
            step="0.000001"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-emerald"
          />
        </div>

        <div>
          <label htmlFor="image" className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase">
            Foto de evidencia
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png"
            required
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none file:mr-3 file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-sm file:text-ink focus:border-emerald"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Una IA revisa que la foto respalde la necesidad descrita antes de verificar la causa (UC-006). JPEG o PNG, hasta 5 MB.
          </p>
        </div>

        {formError && <p className="text-sm text-brick">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-emerald-dark disabled:opacity-60"
        >
          {submitting ? "Creando…" : "Crear y publicar causa"}
        </button>
      </form>
    </AuthCard>
  );
}
