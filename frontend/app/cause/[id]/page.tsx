"use client";

// UC-008: Ver detalle de causa · UC-006: estado y reintento de verificación ·
// UC-009: bloque Donar (S2, S3). Público; las acciones dependen del estado y de
// quién mira (frontend_spec S2).

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CauseProgress } from "@/components/CauseProgress";
import { CauseStatusBadge } from "@/components/dashboard/CauseStatusBadge";
import { DonateBlock } from "@/components/DonateBlock";
import { DonationsTable } from "@/components/cause/DonationsTable";
import { RetryVerification } from "@/components/RetryVerification";
import { ApiError, getCause, imageSrc, type CauseDetail } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useSessionUser } from "@/lib/useSession";

const POLL_MS = 5_000;

export default function CauseDetailPage() {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const [cause, setCause] = useState<CauseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const user = useSessionUser();

  const load = useCallback(() => {
    getCause(id)
      .then((data) => {
        setCause(data);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : t("detail.loadFail"));
      });
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = Boolean(user && cause && user.id === cause.recipient_id);
  const status = cause?.status;

  // S2-3: el titular ve el veredicto sin recargar mientras la causa está En revisión.
  useEffect(() => {
    if (!isOwner || status !== "Pending") return;
    const timer = setInterval(() => load(), POLL_MS);
    return () => clearInterval(timer);
  }, [isOwner, status, load]);

  if (notFound) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-fg">{t("detail.notFound")}</h1>
        <Link href="/causes" className="mt-4 inline-block text-sm font-medium text-eag-secondary hover:underline">
          {t("detail.backList")}
        </Link>
      </section>
    );
  }
  if (error && !cause) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-danger">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-3 border border-edge px-4 py-2 text-sm text-fg-soft hover:border-fg-soft hover:text-fg rounded-sm"
        >
          {t("common.retry")}
        </button>
      </section>
    );
  }
  if (!cause) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-fg-soft">{t("detail.loading")}</p>
      </section>
    );
  }

  const src = imageSrc(cause.image_url);
  const confidence =
    cause.verification_confidence != null ? Math.round(Number(cause.verification_confidence) * 100) : null;
  const linkedUser = user?.wallet_address ? (user as AuthUser & { wallet_address: string }) : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/causes" className="text-sm text-fg-soft hover:text-fg">
        {t("detail.back")}
      </Link>

      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- la evidencia la sirve la API
        <img src={src} alt="" className="mt-4 aspect-video w-full rounded-lg border border-edge object-cover" />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{cause.title}</h1>
        <CauseStatusBadge status={cause.status} />
      </div>
      <p className="mt-1 text-sm text-fg-soft">{cause.recipient_name}</p>
      <p className="mt-4 whitespace-pre-line text-fg">{cause.description}</p>

      <div className="mt-6">
        <CauseProgress collected={cause.collected} target={cause.target_amount} />
      </div>

      {cause.verification_reason && (cause.status === "Verified" || cause.status === "Rejected" || cause.status === "Completed") && (
        <div className="mt-6 border border-edge bg-surface rounded-lg p-4">
          <h2 className="text-sm font-semibold text-fg">{t("detail.verdict")}</h2>
          <p className="mt-1 text-sm text-fg">{cause.verification_reason}</p>
          {confidence !== null && <p className="mt-1 text-xs text-fg-soft">{t("detail.confidence", { n: confidence })}</p>}
        </div>
      )}

      <div className="mt-8">
        {cause.status === "Pending" && (
          <div>
            <p className="text-sm text-fg-soft">{isOwner ? t("detail.pendingOwner") : t("detail.pending")}</p>
            {isOwner && <RetryVerification causeId={cause.id} onQueued={() => load()} />}
          </div>
        )}

        {cause.status === "Rejected" && (
          <div>
            <p className="text-sm text-danger">{t("detail.rejected")}</p>
            {isOwner && (
              <Link
                href="/cause/create"
                className="mt-3 inline-block bg-eag-gradient rounded-sm px-4 py-2 text-sm font-medium text-canvas hover:brightness-110"
              >
                {t("detail.createAnother")}
              </Link>
            )}
          </div>
        )}

        {cause.status === "Completed" && (
          <div>
            <p className="text-sm font-medium text-eag-secondary">{t("detail.completed")}</p>
            {isOwner && (
              <Link href="/dashboard" className="mt-2 inline-block text-sm text-eag-secondary hover:underline">
                {t("detail.withdrawInDash")}
              </Link>
            )}
          </div>
        )}

        {cause.status === "Verified" &&
          (isOwner ? (
            <Link href="/dashboard" className="text-sm font-medium text-eag-secondary hover:underline">
              {t("detail.toDash")}
            </Link>
          ) : linkedUser ? (
            <DonateBlock causeId={cause.id} user={linkedUser} onDonated={() => load()} />
          ) : user ? (
            <p className="text-sm text-fg-soft">
              <Link href="/wallet" className="font-medium text-eag-secondary hover:underline">
                {t("detail.linkWallet")}
              </Link>{" "}
              {t("detail.toDonate")}
            </p>
          ) : (
            <p className="text-sm text-fg-soft">
              <Link href="/auth/login" className="font-medium text-eag-secondary hover:underline">
                {t("detail.login")}
              </Link>{" "}
              {t("detail.loginToDonate")}
            </p>
          ))}
      </div>

      <div className="mt-12">
        <h2 className="font-display text-xl font-semibold text-fg">{t("detail.donations")}</h2>
        <div className="mt-3">
          <DonationsTable donations={cause.donations} />
        </div>
      </div>
    </section>
  );
}
