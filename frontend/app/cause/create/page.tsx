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
import { useT, type MessageKey } from "@/lib/i18n";
import { WalletError, publishCauseOnChain } from "@/lib/wallet";

const ALREADY_PUBLISHED = "Cause already published on-chain";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];

type Stage = "publishing" | "publish_failed" | "uploading" | "upload_failed" | "done";

export default function CreateCausePage() {
  const { t } = useT();
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

  // UC-004 A2 / S5-2: sin sesión -> login; sin wallet vinculada -> /wallet antes de crear nada.
  useEffect(() => {
    if (!token) router.replace("/auth/login");
    else if (!user?.wallet_address) router.replace("/wallet");
  }, [token, user, router]);

  if (!token || !user?.wallet_address) return null;

  async function publishAndUpload(created: CauseResponse, file: File, walletAddress: string) {
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    setStage("publishing");
    setStageError(null);
    let published: CauseResponse = created;
    try {
      const instruction = await requestPublishInstruction(token, created.id);
      const txHash = await publishCauseOnChain(instruction, walletAddress);
      published = await confirmPublish(token, created.id, txHash);
      setCause(published);
    } catch (err) {
      // S5-3: la causa ya estaba publicada; se sigue con la foto sin volver a firmar.
      if (err instanceof CauseError && err.message === ALREADY_PUBLISHED) {
        return uploadStep(token, published);
      }
      setStage("publish_failed");
      setStageError(
        err instanceof WalletError || err instanceof CauseError
          ? err.message
          : t("create.stage.publish_failed")
      );
      return;
    }

    await uploadStep(token, published, file);
  }

  async function uploadStep(authToken: string, target: CauseResponse, file: File | null = image) {
    if (!file) return;
    setStage("uploading");
    try {
      await uploadCauseImage(authToken, target.id, file);
      setStage("done");
      router.push(`/cause/${target.id}`); // S5-1: termina en el detalle, "En revisión"
    } catch (err) {
      setStage("upload_failed");
      setStageError(err instanceof CauseError ? err.message : t("create.stage.upload_failed"));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // A1: título, descripción o monto inválidos.
    if (title.trim().length < 5) {
      setFormError(t("create.err.title"));
      return;
    }
    if (description.trim().length < 20) {
      setFormError(t("create.err.desc"));
      return;
    }
    const amount = Number(targetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError(t("create.err.amount")); // BR-002
      return;
    }
    if (!image) {
      setFormError(t("create.err.photo"));
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
      setFormError(t("create.err.type")); // UC-005 BR-002
      return;
    }
    if (image.size > MAX_IMAGE_BYTES) {
      setFormError(t("create.err.size")); // UC-005 BR-004
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
      setFormError(err instanceof CauseError ? err.message : t("create.err.fail"));
    } finally {
      setSubmitting(false);
    }
  }

  async function retryPublish() {
    if (!cause || !image || !user?.wallet_address) return;
    await publishAndUpload(cause, image, user.wallet_address);
  }

  async function retryUpload() {
    if (!token || !cause) return;
    await uploadStep(token, cause);
  }

  if (stage === "done") {
    return (
      <AuthCard
        title={t("create.doneTitle")}
        subtitle={t("create.doneSubtitle")}
      >
        <Link
          href="/dashboard"
          className="inline-block bg-eag-gradient rounded-sm px-4 py-2.5 text-center text-sm font-medium text-canvas transition-colors hover:brightness-110"
        >
          {t("detail.toDash")}
        </Link>
      </AuthCard>
    );
  }

  // Tras crear la causa, el formulario se reemplaza por el estado del flujo
  // de publicación/subida; cada paso se puede reintentar sin duplicar la causa.
  if (cause && stage) {
    return (
      <AuthCard title={cause.title} subtitle={t("create.publishing")}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-fg-soft">{t(`create.stage.${stage}` as MessageKey)}</p>

          {stageError && <p className="text-sm text-danger">{stageError}</p>}

          {stage === "publish_failed" && (
            <button
              type="button"
              onClick={retryPublish}
              className="bg-eag-gradient rounded-sm px-4 py-2.5 text-center text-sm font-medium text-canvas transition-colors hover:brightness-110"
            >
              {t("create.retryPublish")}
            </button>
          )}

          {stage === "upload_failed" && (
            <button
              type="button"
              onClick={retryUpload}
              className="bg-eag-gradient rounded-sm px-4 py-2.5 text-center text-sm font-medium text-canvas transition-colors hover:brightness-110"
            >
              {t("create.retryUpload")}
            </button>
          )}
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("create.title")}
      subtitle={t("create.subtitle")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase">
            {t("create.title.label")}
          </label>
          <input
            id="title"
            type="text"
            required
            minLength={5}
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase"
          >
            {t("create.desc.label")}
          </label>
          <textarea
            id="description"
            required
            minLength={20}
            maxLength={2000}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full resize-none border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
          <p className="mt-1 text-xs text-fg-soft">{t("create.desc.hint")}</p>
        </div>

        <div>
          <label
            htmlFor="target_amount"
            className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase"
          >
            {t("create.amount.label")}
          </label>
          <input
            id="target_amount"
            type="number"
            min="0.000001"
            step="0.000001"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
        </div>

        <div>
          <label htmlFor="image" className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase">
            {t("create.photo.label")}
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png"
            required
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none file:mr-3 file:border-0 file:bg-edge file:px-3 file:py-1.5 file:text-sm file:text-fg focus:border-eag-secondary rounded-sm"
          />
          <p className="mt-1 text-xs text-fg-soft">
            {t("create.photo.hint")}
          </p>
        </div>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-eag-gradient rounded-sm px-4 py-2.5 text-center text-sm font-medium text-canvas transition-colors hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? t("create.submitting") : t("create.submit")}
        </button>
      </form>
    </AuthCard>
  );
}
