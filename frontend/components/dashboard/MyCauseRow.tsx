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
import { useT } from "@/lib/i18n";
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
  const { t } = useT();
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
      setMessage(err instanceof ApiError ? err.message : t("row.prepFail"));
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
      setMessage(err instanceof WalletError || err instanceof ApiError ? err.message : t("row.withdrawFail"));
    }
  }

  return (
    <article className="flex flex-col gap-3 border border-edge bg-surface rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/cause/${cause.id}`} className="truncate font-display text-lg font-semibold text-fg hover:underline">
              {cause.title}
            </Link>
            <CauseStatusBadge status={cause.status} />
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-fg-soft">{cause.description}</p>
          {hasVerdict && (
            <button
              type="button"
              onClick={() => setShowVerdict(true)}
              className="mt-1 text-xs font-medium text-eag-secondary hover:underline"
            >
              {isRejected ? t("row.rejectedWhy") : t("row.aiReason")}
            </button>
          )}
          {cause.status === "Pending" && <RetryVerification causeId={cause.id} onQueued={onChanged} />}
        </div>
        <div className="w-full shrink-0 sm:w-64">
          <CauseProgress collected={cause.collected} target={cause.target_amount} />
        </div>
      </div>

      {(cause.status === "Verified" || cause.status === "Completed") && (
        <div className="flex flex-wrap items-center gap-3 border-t border-edge pt-3 text-sm">
          <span className="text-fg-soft">
            {t("row.available")} {available === null ? "—" : <UsdtAmount value={available} />}
          </span>
          {canWithdraw && phase !== "confirming" && phase !== "signing" && phase !== "waiting" && (
            <button
              type="button"
              onClick={() => void startWithdraw()}
              className="bg-eag-gradient rounded-sm px-3 py-1.5 text-xs font-medium text-canvas hover:brightness-110"
            >
              {t("row.withdraw")}
            </button>
          )}
        </div>
      )}

      {phase === "confirming" && instruction && (
        <div className="border border-edge p-3 text-sm rounded-lg">
          <p>
            {t("row.willWithdraw")} <UsdtAmount value={instruction.amount} /> {t("row.to")}{" "}
            <span className="font-mono">{shortAddress(instruction.to_wallet ?? walletAddress ?? "")}</span>
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmWithdraw()}
              className="bg-eag-gradient rounded-sm px-3 py-1.5 text-xs font-medium text-canvas hover:brightness-110"
            >
              {t("row.confirm")}
            </button>
            <button type="button" onClick={() => setPhase("idle")} className="border border-edge px-3 py-1.5 text-xs text-fg-soft rounded-sm">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
      {phase === "signing" && <p className="text-sm text-fg-soft">{t("row.signing")}</p>}
      {phase === "waiting" && <p className="text-sm text-fg-soft">{t("row.waiting")}</p>}
      {phase === "done" && txHash && (
        <p className="text-sm text-ok">
          {t("row.done")} <ExplorerLink hash={txHash} label={t("common.viewTx")} />
        </p>
      )}
      {message && <p className="text-sm text-danger">{message}</p>}

      {showVerdict && (
        <Modal
          title={isRejected ? t("row.modalRejected") : t("row.modalVerdict")}
          onClose={() => setShowVerdict(false)}
        >
          <div className="flex flex-col gap-3">
            <CauseStatusBadge status={cause.status} />
            <p className="text-sm text-fg">{cause.verification_reason}</p>
            {cause.verification_confidence != null && (
              <p className="text-xs text-fg-soft">
                {t("detail.confidence", { n: Math.round(Number(cause.verification_confidence) * 100) })}
              </p>
            )}
            {isRejected && (
              <p className="text-xs text-fg-soft">
                {t("row.rejectedHint")}
              </p>
            )}
          </div>
        </Modal>
      )}
    </article>
  );
}
