"use client";

// UC-008: Ver detalle de causa. Ruta pública (no requiere sesión); si hay
// sesión y el usuario es el titular, se ofrece sondeo del veredicto y
// reintentar verificación (UC-006) mientras la causa está "Pending".
// Incluye el bloque de donar (UC-009, UC-014) cuando corresponde
// (S2-6, S2-7 de docs/frontend_spec.md).

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredToken, getStoredUser, type AuthUser } from "@/lib/auth";
import {
  CauseError,
  fetchCauseById,
  resolveCauseImageUrl,
  retryVerification,
  type CauseResponse,
} from "@/lib/causes";
import { BlockMeter } from "@/components/BlockMeter";
import { CauseStatusBadge } from "@/components/dashboard/CauseStatusBadge";
import { DonationsTable } from "@/components/cause/DonationsTable";
import { DonationForm } from "@/components/cause/DonationForm";

const POLL_INTERVAL_MS = 5_000;
const RETRY_AFTER_MS = 2 * 60 * 1000;

export default function CauseDetailPage() {
  const params = useParams<{ id: string }>();
  const causeId = params.id;

  const [cause, setCause] = useState<CauseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  // El usuario y el token ya están en localStorage antes del primer render (o
  // no hay sesión); no dependen de datos que lleguen tras un efecto.
  const [user] = useState<AuthUser | null>(() => getStoredUser());
  const [token] = useState<string | null>(() => getStoredToken());

  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const pendingSinceRef = useRef<number | null>(null);

  function applyCauseResult(data: CauseResponse | null, err: unknown) {
    if (data) {
      setCause(data);
      setError(null);
      return;
    }
    if (err instanceof CauseError) {
      // A1: la causa no existe.
      if (err.message === "Esta causa no existe.") setNotFound(true);
      else setError(err.message);
    } else {
      setError("No se pudo cargar la causa.");
    }
  }

  // El refresco periódico (sondeo, reintentar verificación) llama a esta
  // función desde un callback (temporizador o manejador de clic).
  const refresh = useCallback(() => {
    fetchCauseById(causeId)
      .then((data) => applyCauseResult(data, null))
      .catch((err) => applyCauseResult(null, err))
      .finally(() => setLoading(false));
  }, [causeId]);

  useEffect(() => {
    fetchCauseById(causeId)
      .then((data) => applyCauseResult(data, null))
      .catch((err) => applyCauseResult(null, err))
      .finally(() => setLoading(false));
  }, [causeId]);

  // S2-3: mientras la causa del titular está "En revisión", sondear cada 5 s
  // hasta que el estado cambie. S2-4: tras 2 min, habilitar "Reintentar".
  useEffect(() => {
    if (!cause || cause.status !== "Pending") {
      pendingSinceRef.current = null;
      return;
    }
    if (pendingSinceRef.current === null) {
      pendingSinceRef.current = Date.now();
    }

    const interval = setInterval(() => {
      refresh();
      const since = pendingSinceRef.current;
      setCanRetry(since !== null && Date.now() - since >= RETRY_AFTER_MS);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cause, refresh]);

  async function handleRetryVerification() {
    const token = getStoredToken();
    if (!token) return;
    setRetrying(true);
    setRetryMessage(null);
    try {
      await retryVerification(token, Number(causeId));
      setRetryMessage("Verificación en cola.");
      pendingSinceRef.current = Date.now();
      refresh();
    } catch (err) {
      setRetryMessage(err instanceof CauseError ? err.message : "No se pudo reintentar la verificación.");
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm text-ink-soft">Cargando causa…</p>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 text-center">
        <p className="text-lg font-medium text-ink">Esta causa no existe.</p>
        {/* UC-007: /causes (S1) todavía no existe como ruta; el listado real vive en la landing. */}
        <Link href="/" className="mt-4 inline-block text-sm text-blueprint hover:underline">
          Volver a las causas verificadas
        </Link>
      </section>
    );
  }

  if (error || !cause) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-sm text-brick">{error ?? "No se pudo cargar la causa."}</p>
      </section>
    );
  }

  const imageUrl = resolveCauseImageUrl(cause.image_url);
  const isOwner = user !== null && user.id === cause.recipient_id;
  const target = Number(cause.target_amount);
  const collected = Number(cause.collected);
  const percent = target > 0 ? Math.min(Math.round((collected / target) * 100), 100) : 0;
  const hasVerdict = (cause.status === "Verified" || cause.status === "Rejected") && Boolean(cause.verification_reason);

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="overflow-hidden border border-line bg-paper-raised">
        <div className="relative aspect-[16/9] border-b border-line bg-paper">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto servida por el backend (UC-005), tamaño variable
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-ink-soft">
              Sin foto
            </div>
          )}
          <span className="absolute top-3 left-3">
            <CauseStatusBadge status={cause.status} />
          </span>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {cause.title}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {cause.recipient_name ?? "Receptor"}
            </p>
          </div>

          <p className="text-sm text-ink-soft whitespace-pre-line">{cause.description}</p>

          <div>
            <BlockMeter collected={collected} target={target} />
            <p className="mt-2 text-xs text-ink-soft">{percent}% del objetivo recaudado</p>
          </div>

          {hasVerdict && (
            <div className="border border-line p-4">
              <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
                Veredicto de la IA
              </p>
              <p className="mt-1 text-sm text-ink">{cause.verification_reason}</p>
              {cause.verification_confidence != null && (
                <p className="mt-1 text-xs text-ink-soft">
                  Confianza del modelo: {Math.round(Number(cause.verification_confidence) * 100)}%
                </p>
              )}
            </div>
          )}

          <CauseStatusAction
            cause={cause}
            isOwner={isOwner}
            user={user}
            token={token}
            canRetry={canRetry}
            retrying={retrying}
            retryMessage={retryMessage}
            onRetry={handleRetryVerification}
            onDonated={refresh}
          />

          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Donaciones ({cause.donations.length})
            </h2>
            <div className="mt-3">
              <DonationsTable donations={cause.donations} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// UC-008 A2, A3; S2-6, S2-7: qué acción u mensaje mostrar según el estado de
// la causa y quién la mira. UC-009/UC-014: bloque de donar cuando corresponde.
function CauseStatusAction({
  cause,
  isOwner,
  user,
  token,
  canRetry,
  retrying,
  retryMessage,
  onRetry,
  onDonated,
}: {
  cause: CauseResponse;
  isOwner: boolean;
  user: AuthUser | null;
  token: string | null;
  canRetry: boolean;
  retrying: boolean;
  retryMessage: string | null;
  onRetry: () => void;
  onDonated: () => void;
}) {
  const hasUser = user !== null;
  if (cause.status === "Pending") {
    if (!isOwner) {
      return (
        <p className="text-sm text-ink-soft">
          Esta causa está en revisión por la IA. Vuelve pronto para ver el resultado.
        </p>
      );
    }
    return (
      <div className="border border-line bg-paper p-4">
        <p className="text-sm text-ink">Tu causa está en revisión…</p>
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="mt-3 border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            {retrying ? "Reintentando…" : "Reintentar verificación"}
          </button>
        )}
        {retryMessage && <p className="mt-2 text-xs text-ink-soft">{retryMessage}</p>}
      </div>
    );
  }

  if (cause.status === "Rejected") {
    return isOwner ? (
      <Link
        href="/cause/create"
        className="inline-block self-start bg-blueprint px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-blueprint-dark"
      >
        Crear otra causa
      </Link>
    ) : null;
  }

  if (cause.status === "Completed") {
    return (
      <p className="text-sm font-medium text-blueprint">
        Esta causa alcanzó su meta. ¡Gracias a quienes donaron!
        {isOwner && (
          <>
            {" "}
            <Link href="/dashboard" className="underline">
              Ir a mi dashboard
            </Link>
          </>
        )}
      </p>
    );
  }

  // Verified.
  if (isOwner) {
    return (
      <p className="text-sm text-ink-soft">
        Esta es tu causa.{" "}
        <Link href="/dashboard" className="text-blueprint hover:underline">
          Ve a tu dashboard
        </Link>{" "}
        para retirar los fondos disponibles.
      </p>
    );
  }

  // S2 tabla "Verificada": sin sesión o sin wallet vinculada, mismo mensaje.
  if (!hasUser || !user?.wallet_address || !token) {
    return (
      <p className="text-sm text-ink-soft">
        {hasUser ? (
          <Link href="/wallet" className="text-blueprint hover:underline">
            Vincula tu wallet
          </Link>
        ) : (
          <Link href="/auth/login" className="text-blueprint hover:underline">
            Inicia sesión
          </Link>
        )}{" "}
        para donar a esta causa.
      </p>
    );
  }

  return (
    <DonationForm cause={cause} token={token} walletAddress={user.wallet_address} onDonated={onDonated} />
  );
}
