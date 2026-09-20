"use client";

// UC-011: fila de una causa propia · UC-010: retirar fondos · UC-006: reintentar (S4).
// Retirar: instrucción -> confirmación de la persona -> firma -> recibo -> recarga.

import Link from "next/link";
import { useState } from "react";
import { CauseProgress } from "@/components/CauseProgress";
import { ExplorerLink } from "@/components/ExplorerLink";
import { Modal } from "@/components/Modal";
import { RetryVerification } from "@/components/RetryVerification";
import { UsdtAmount } from "@/components/UsdtAmount";
import { ApiError, requestWithdraw, type DashboardCauseFull, type SignInstruction } from "@/lib/api";
import { VAULT_ABI } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { WalletError, ensureLinkedAccount, sendContractTx, waitForReceipt } from "@/lib/wallet";
import { CauseStatusBadge } from "./CauseStatusBadge";

type WithdrawPhase = "idle" | "confirming" | "signing" | "waiting" | "done" | "error";

export function MyCauseRow({
  cause,
  walletAddress,
  onChanged,
}: {
  cause: DashboardCauseFull;
  walletAddress: string | null;
  onChanged: () => void;
}) {
  const [showVerdict, setShowVerdict] = useState(false);
  const [phase, setPhase] = useState<WithdrawPhase>("idle");
  const [instruction, setInstruction] = useState<SignInstruction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isRejected = cause.status === "Rejected";
  const hasVerdict = (cause.status === "Verified" || isRejected) && Boolean(cause.verification_reason);
  const available = cause.available_to_withdraw;
  const canWithdraw =
    available !== null && Number(available) > 0 && (cause.status === "Verified" || cause.status === "Completed");

  async function startWithdraw() {
    setMessage(null);
    try {
      setInstruction(await requestWithdraw(cause.id));
      setPhase("confirming");
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof ApiError ? err.message : "No se pudo preparar el retiro.");
    }
  }

  async function confirmWithdraw() {
    if (!instruction || !walletAddress) return;
    try {
      setPhase("signing");
      await ensureLinkedAccount(walletAddress);
      const hash = await sendContractTx({
        from: walletAddress,
        to: instruction.contract,
        abi: VAULT_ABI,
        functionName: "withdrawFunds",
        args: [BigInt(instruction.params[0])],
      });
      setTxHash(hash);
      setPhase("waiting");
      await waitForReceipt(hash);
      setPhase("done");
      onChanged();
    } catch (err) {
      setPhase("error");
      setMessage(err instanceof WalletError || err instanceof ApiError ? err.message : "No se pudo retirar.");
    }
  }

  return (
    <article className="flex flex-col gap-3 border border-line bg-paper-raised p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/cause/${cause.id}`} className="truncate font-display text-lg font-semibold text-ink hover:underline">
              {cause.title}
            </Link>
            <CauseStatusBadge status={cause.status} />
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-ink-soft">{cause.description}</p>
          {hasVerdict && (
            <button
              type="button"
              onClick={() => setShowVerdict(true)}
              className="mt-1 text-xs font-medium text-blueprint hover:underline"
            >
              {isRejected ? "Ver por qué se rechazó" : "Ver motivo de la IA"}
            </button>
          )}
          {cause.status === "Pending" && <RetryVerification causeId={cause.id} onQueued={onChanged} />}
        </div>
        <div className="w-full shrink-0 sm:w-64">
          <CauseProgress collected={cause.collected} target={cause.target_amount} />
        </div>
      </div>

      {(cause.status === "Verified" || cause.status === "Completed") && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
          <span className="text-ink-soft">
            Disponible para retirar: {available === null ? "—" : <UsdtAmount value={available} />}
          </span>
          {canWithdraw && phase !== "confirming" && phase !== "signing" && phase !== "waiting" && (
            <button
              type="button"
              onClick={() => void startWithdraw()}
              className="bg-blueprint px-3 py-1.5 text-xs font-medium text-paper hover:bg-blueprint-dark"
            >
              Retirar
            </button>
          )}
        </div>
      )}

      {phase === "confirming" && instruction && (
        <div className="border border-line p-3 text-sm">
          <p>
            Retirarás <UsdtAmount value={instruction.amount} /> a{" "}
            <span className="font-mono">{shortAddress(instruction.to_wallet ?? walletAddress ?? "")}</span>
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmWithdraw()}
              className="bg-blueprint px-3 py-1.5 text-xs font-medium text-paper hover:bg-blueprint-dark"
            >
              Confirmar retiro
            </button>
            <button type="button" onClick={() => setPhase("idle")} className="border border-line px-3 py-1.5 text-xs text-ink-soft">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {phase === "signing" && <p className="text-sm text-ink-soft">Firma el retiro en tu wallet…</p>}
      {phase === "waiting" && <p className="text-sm text-ink-soft">Esperando la confirmación en la cadena…</p>}
      {phase === "done" && txHash && (
        <p className="text-sm text-moss">
          Retiro confirmado. <ExplorerLink hash={txHash} label="Ver transacción" />
        </p>
      )}
      {message && <p className="text-sm text-brick">{message}</p>}

      {showVerdict && (
        <Modal
          title={isRejected ? "Por qué se rechazó tu causa" : "Veredicto de la IA"}
          onClose={() => setShowVerdict(false)}
        >
          <div className="flex flex-col gap-3">
            <CauseStatusBadge status={cause.status} />
            <p className="text-sm text-ink">{cause.verification_reason}</p>
            {cause.verification_confidence != null && (
              <p className="text-xs text-ink-soft">
                Confianza del modelo: {Math.round(Number(cause.verification_confidence) * 100)}%
              </p>
            )}
            {isRejected && (
              <p className="text-xs text-ink-soft">
                Puedes crear una nueva causa con una foto que muestre la necesidad con más claridad.
              </p>
            )}
          </div>
        </Modal>
      )}
    </article>
  );
}
