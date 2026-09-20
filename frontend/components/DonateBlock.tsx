"use client";

// UC-009: Donar · UC-014: Registrar donación (S3, FR-025)
// Secuencia: instrucción -> (approve) -> donate -> guardar pendiente -> registrar.
// El backend nunca firma (C-009): aquí se firma con la wallet y se confirma con el hash.

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useT } from "@/lib/i18n";
import { ExplorerLink } from "@/components/ExplorerLink";
import { TxStepper, type StepState } from "@/components/TxStepper";
import { ApiError, confirmDonation, requestDonation } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import { ERC20_ABI, TOKEN_ADDRESS, VAULT_ABI } from "@/lib/chain";
import { formatUsdt, parseUsdtInput } from "@/lib/format";
import { removePending, savePending } from "@/lib/pendingDonations";
import {
  WalletError,
  ensureLinkedAccount,
  readUsdtAllowance,
  readUsdtBalance,
  sendContractTx,
  waitForReceipt,
} from "@/lib/wallet";

type Phase = "idle" | "approving" | "donating" | "registering" | "done" | "error";

const STEP_ORDER: Phase[] = ["approving", "donating", "registering"];

function stepState(phase: Phase, step: Phase, failedAt: Phase | null): StepState {
  if (phase === "done") return "done";
  const at = phase === "error" ? failedAt : phase;
  const i = STEP_ORDER.indexOf(step);
  const cur = at ? STEP_ORDER.indexOf(at) : -1;
  if (phase === "error" && i === cur) return "error";
  if (i < cur) return "done";
  if (i === cur) return "active";
  return "pending";
}

export function DonateBlock({
  causeId,
  user,
  onDonated,
}: {
  causeId: number;
  user: AuthUser & { wallet_address: string };
  onDonated: () => void;
}) {
  const { t } = useT();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [failedAt, setFailedAt] = useState<Phase | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [donatedHash, setDonatedHash] = useState<string | null>(null);
  const [donatedAmount, setDonatedAmount] = useState("");

  useEffect(() => {
    readUsdtBalance(user.wallet_address)
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [user.wallet_address, donatedHash]);

  const parsed = amount.trim() === "" ? null : parseUsdtInput(amount);
  const invalidReason = parsed && !parsed.ok ? parsed.reason : null;
  const overBalance = parsed?.ok && balance !== null && parsed.micros > balance;
  const busy = phase === "approving" || phase === "donating" || phase === "registering";
  const disabledReason = invalidReason ?? (overBalance ? t("donate.overBalance") : null);
  const canSubmit = parsed?.ok === true && !disabledReason && !busy;

  async function handleDonate() {
    if (!parsed?.ok) return;
    const normalized = amount.trim().replace(",", ".");
    setMessage(null);
    setFailedAt(null);
    setDonatedHash(null);
    let current: Phase = "approving";
    setPhase(current);
    let txHash: string | null = null;
    try {
      const instruction = await requestDonation(causeId, normalized);
      await ensureLinkedAccount(user.wallet_address);

      const [onchainId, amount6] = instruction.params;
      const vault = instruction.contract;
      const value = BigInt(amount6);

      const allowance = await readUsdtAllowance(user.wallet_address, vault);
      if (allowance < value) {
        const approveHash = await sendContractTx({
          from: user.wallet_address,
          to: instruction.approve?.contract ?? TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [vault, value],
        });
        await waitForReceipt(approveHash);
      }

      current = "donating";
      setPhase(current);
      txHash = await sendContractTx({
        from: user.wallet_address,
        to: vault,
        abi: VAULT_ABI,
        functionName: "donate",
        args: [BigInt(onchainId), value],
      });
      // Antes de registrar: cerrar la pestaña aquí no debe perder la donación (FR-025).
      savePending({ causeId, txHash, amount: normalized, createdAt: new Date().toISOString() });
      await waitForReceipt(txHash);

      current = "registering";
      setPhase(current);
      await confirmDonation(causeId, txHash);
      removePending(txHash);

      setDonatedHash(txHash);
      setDonatedAmount(normalized);
      setPhase("done");
      setAmount("");
      onDonated();
    } catch (err) {
      setFailedAt(current);
      setPhase("error");
      if (err instanceof ApiError && err.notConfirmedYet) {
        setMessage(t("donate.notRegistered"));
      } else if (err instanceof ApiError || err instanceof WalletError) {
        if (txHash && err instanceof WalletError) removePending(txHash);
        setMessage(err.message);
      } else {
        setMessage(t("donate.fail"));
      }
    }
  }

  return (
    <div className="border border-edge bg-surface rounded-lg p-5">
      <h2 className="font-display text-xl font-semibold text-fg">{t("donate.title")}</h2>
      <p className="mt-1 text-sm text-fg-soft">
        {t("donate.lead")}
        {balance !== null && <> {t("donate.balance")} <span className="font-mono">{formatUsdt(formatUnits(balance, 6))}</span>.</>}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="donation-amount" className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase">
            {t("donate.amount")}
          </label>
          <input
            id="donation-amount"
            inputMode="decimal"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1"
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
          {disabledReason && <p className="mt-1 text-xs text-danger">{disabledReason}</p>}
        </div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleDonate()}
          className="bg-eag-gradient rounded-sm px-5 py-2 text-sm font-medium text-canvas transition-colors hover:brightness-110 disabled:opacity-50 sm:mt-5"
        >
          {busy ? t("donate.busy") : t("donate.btn")}
        </button>
      </div>

      {phase !== "idle" && (
        <div className="mt-4">
          <TxStepper
            steps={[
              { label: t("donate.stepApprove"), state: stepState(phase, "approving", failedAt) },
              { label: t("donate.stepDonate"), state: stepState(phase, "donating", failedAt) },
              { label: t("donate.stepRegister"), state: stepState(phase, "registering", failedAt) },
            ]}
          />
        </div>
      )}

      {message && <p className="mt-3 text-sm text-danger">{message}</p>}

      {phase === "done" && donatedHash && (
        <p className="mt-3 text-sm text-ok">
          {t("donate.thanks", { amount: formatUsdt(donatedAmount) })} <ExplorerLink hash={donatedHash} label={t("common.viewTx")} />
        </p>
      )}
    </div>
  );
}
