"use client";

// UC-006 A8 (S2-4): pasados 2 minutos En revisión, el titular puede reintentar la verificación.

import { useEffect, useState } from "react";
import { ApiError, retryVerification } from "@/lib/api";
import { useT } from "@/lib/i18n";

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
  const { t } = useT();
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
      setMessage(t("retry.queued"));
      onQueued?.();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : t("retry.fail"));
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
          className="border border-edge px-3 py-1 text-xs font-medium text-fg-soft hover:border-fg-soft hover:text-fg disabled:opacity-60 rounded-sm"
        >
          {t("retry.button")}
        </button>
      )}
      {message && <p className="mt-1 text-xs text-fg-soft">{message}</p>}
    </div>
  );
}
