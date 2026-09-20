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
import { ExplorerLink } from "@/components/ExplorerLink";
import { RetryVerification } from "@/components/RetryVerification";
import { UsdtAmount } from "@/components/UsdtAmount";
import { ApiError, getCause, imageSrc, type CauseDetail } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { useSessionUser } from "@/lib/useSession";
import { formatDate, shortAddress } from "@/lib/format";

const POLL_MS = 5_000;

export default function CauseDetailPage() {
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
        else setError(err instanceof Error ? err.message : "No se pudo cargar la causa.");
      });
  }, [id]);

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
        <h1 className="font-display text-3xl font-semibold text-ink">Esta causa no existe</h1>
        <Link href="/causes" className="mt-4 inline-block text-sm font-medium text-blueprint hover:underline">
          Volver a las causas
        </Link>
      </section>
    );
  }
  if (error && !cause) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-brick">{error}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-3 border border-line px-4 py-2 text-sm text-ink-soft hover:border-ink hover:text-ink"
        >
          Reintentar
        </button>
      </section>
    );
  }
  if (!cause) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm text-ink-soft">Cargando la causa…</p>
      </section>
    );
  }

  const src = imageSrc(cause.image_url);
  const confidence =
    cause.verification_confidence != null ? Math.round(Number(cause.verification_confidence) * 100) : null;
  const linkedUser = user?.wallet_address ? (user as AuthUser & { wallet_address: string }) : null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/causes" className="text-sm text-ink-soft hover:text-ink">
        ← Todas las causas
      </Link>

      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- la evidencia la sirve la API
        <img src={src} alt="" className="mt-4 aspect-[4/3] w-full border border-line object-cover" />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{cause.title}</h1>
        <CauseStatusBadge status={cause.status} />
      </div>
      <p className="mt-1 text-sm text-ink-soft">{cause.recipient_name}</p>
      <p className="mt-4 whitespace-pre-line text-ink">{cause.description}</p>

      <div className="mt-6">
        <CauseProgress collected={cause.collected} target={cause.target_amount} />
      </div>

      {cause.verification_reason && (cause.status === "Verified" || cause.status === "Rejected" || cause.status === "Completed") && (
        <div className="mt-6 border border-line bg-paper-raised p-4">
          <h2 className="text-sm font-semibold text-ink">Veredicto de la IA</h2>
          <p className="mt-1 text-sm text-ink">{cause.verification_reason}</p>
          {confidence !== null && <p className="mt-1 text-xs text-ink-soft">Confianza del modelo: {confidence}%</p>}
        </div>
      )}

      <div className="mt-8">
        {cause.status === "Pending" && (
          <div>
            <p className="text-sm text-ink-soft">{isOwner ? "En revisión… esta página se actualiza sola." : "En revisión"}</p>
            {isOwner && <RetryVerification causeId={cause.id} onQueued={() => load()} />}
          </div>
        )}

        {cause.status === "Rejected" && (
          <div>
            <p className="text-sm text-brick">Esta causa fue rechazada y no recibe donaciones.</p>
            {isOwner && (
              <Link
                href="/cause/create"
                className="mt-3 inline-block bg-blueprint px-4 py-2 text-sm font-medium text-paper hover:bg-blueprint-dark"
              >
                Crear otra causa
              </Link>
            )}
          </div>
        )}

        {cause.status === "Completed" && (
          <div>
            <p className="text-sm font-medium text-blueprint">Meta alcanzada</p>
            {isOwner && (
              <Link href="/dashboard" className="mt-2 inline-block text-sm text-blueprint hover:underline">
                Retirar en mi dashboard
              </Link>
            )}
          </div>
        )}

        {cause.status === "Verified" &&
          (isOwner ? (
            <Link href="/dashboard" className="text-sm font-medium text-blueprint hover:underline">
              Ir a mi dashboard
            </Link>
          ) : linkedUser ? (
            <DonateBlock causeId={cause.id} user={linkedUser} onDonated={() => load()} />
          ) : user ? (
            <p className="text-sm text-ink-soft">
              <Link href="/wallet" className="font-medium text-blueprint hover:underline">
                Vincula tu wallet
              </Link>{" "}
              para donar.
            </p>
          ) : (
            <p className="text-sm text-ink-soft">
              <Link href="/auth/login" className="font-medium text-blueprint hover:underline">
                Inicia sesión
              </Link>{" "}
              y vincula tu wallet para donar.
            </p>
          ))}
      </div>

      <div className="mt-12">
        <h2 className="font-display text-xl font-semibold text-ink">Donaciones</h2>
        {cause.donations.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Aún no hay donaciones.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line">
            {cause.donations.map((d) => (
              <li key={d.tx_hash} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <UsdtAmount value={d.amount} />
                <span className="font-mono text-xs text-ink-soft">
                  {d.donor_wallet ? shortAddress(d.donor_wallet) : "—"}
                </span>
                <span className="text-xs text-ink-soft">{formatDate(d.created_at)}</span>
                <ExplorerLink hash={d.tx_hash} label="Ver transacción" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
