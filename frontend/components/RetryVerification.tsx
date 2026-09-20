"use client";

// UC-006 A8 (S2-4): pasados 2 minutos En revisión, el titular puede reintentar la verificación.

import { useEffect, useState } from "react";
import { ApiError, retryVerification } from "@/lib/api";

export const RETRY_AFTER_MS = 120_000;

export function RetryVerification({
  causeId,
  onQueued,
  afterMs = RETRY_AFTER_MS,
}: {
  causeId: number;
  onQueued?: () => void;
  afterMs?: number;
}) {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), afterMs);
    return () => clearTimeout(timer);
  }, [afterMs]);

  async function retry() {
    setBusy(true);
    try {
      await retryVerification(causeId);
      setMessage("Verificación en cola");
      onQueued?.();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo reintentar la verificación.");
      if (err instanceof ApiError && (err.status === 409 || err.status === 400)) onQueued?.();
    } finally {
      setBusy(false);
    }
  }

  if (!ready && !message) return null;
  return (
    <div className="mt-2">
      {ready && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void retry()}
          className="border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-ink hover:text-ink disabled:opacity-60"
        >
          Reintentar verificación
        </button>
      )}
      {message && <p className="mt-1 text-xs text-ink-soft">{message}</p>}
    </div>
  );
}
