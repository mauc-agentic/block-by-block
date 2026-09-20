"use client";

// UC-009: Donar · UC-014: Registrar donación (docs/frontend_spec.md §S3).
//
// Flujo: pedir la instrucción de firma -> asegurar red/cuenta -> `approve`
// del token (si el allowance no alcanza) -> `donate` -> guardar el hash como
// pendiente (FR-025, GAP-034) -> registrar leyendo la cadena, reintentando
// mientras el RPC no vea la transacción todavía -> borrar el pendiente.

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { TxStepper } from "@/components/TxStepper";
import {
  CauseError,
  confirmDonation,
  explorerTxUrl,
  requestDonateInstruction,
  type CauseResponse,
  type DonationRecordResponse,
} from "@/lib/causes";
import {
  WalletError,
  WalletRejectedError,
  approveUsdt,
  donateOnChain,
  getConnectedAccount,
  readUsdtAllowance,
  readUsdtBalance,
  waitForReceipt,
} from "@/lib/wallet";
import {
  addPendingDonation,
  getPendingDonationsForCause,
  removePendingDonation,
  type PendingDonation,
} from "@/lib/pendingDonations";

const STEPS = ["Aprobar USDT", "Donar", "Registrar"];
const AMOUNT_RE = /^\d+(\.\d{1,6})?$/;

type Stage = "idle" | "approving" | "donating" | "registering" | "done";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// Convierte "3.5" -> 3500000n sin errores de punto flotante; null si el
// formato no es válido (más de 6 decimales, vacío, no numérico).
function parseUsdtAmount(value: string): bigint | null {
  const trimmed = value.trim();
  if (!AMOUNT_RE.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  return BigInt(whole) * BigInt(1_000_000) + BigInt(frac.padEnd(6, "0") || "0");
}

function formatUsdt(amount: bigint): string {
  return Number(formatUnits(amount, 6)).toLocaleString("es-CO", { maximumFractionDigits: 6 });
}

function formatUsdtString(amount: string | number): string {
  return Number(amount).toLocaleString("es-CO", { maximumFractionDigits: 6 });
}

export function DonationForm({
  cause,
  token,
  walletAddress,
  onDonated,
}: {
  cause: CauseResponse;
  token: string;
  walletAddress: string;
  onDonated: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [successRecord, setSuccessRecord] = useState<DonationRecordResponse | null>(null);

  // Lectura síncrona de localStorage al montar (mismo patrón que
  // getStoredUser() en la página): no depende de un efecto porque no hay
  // nada externo que suscribir, solo un valor inicial.
  const [pending, setPending] = useState<PendingDonation[]>(() => getPendingDonationsForCause(cause.id));
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    readUsdtBalance(walletAddress)
      .then((value) => setBalance(value))
      .catch((err) => setBalanceError(err instanceof WalletError ? err.message : "No se pudo leer tu saldo de USDT."));
  }, [walletAddress]);

  // FR-025: recupera una donación firmada cuya confirmación quedó pendiente
  // (p.ej. se cerró la pestaña entre `donate` y `donations/confirm`).
  async function handleRecover(entry: PendingDonation) {
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      const record = await confirmDonation(token, cause.id, entry.txHash);
      removePendingDonation(entry.txHash);
      setPending((prev) => prev.filter((p) => p.txHash !== entry.txHash));
      setSuccessRecord(record);
      onDonated();
    } catch (err) {
      if (err instanceof CauseError && err.message === "Transaction already registered") {
        removePendingDonation(entry.txHash);
        setPending((prev) => prev.filter((p) => p.txHash !== entry.txHash));
        onDonated();
      } else {
        setRecoveryError(err instanceof CauseError ? err.message : "No se pudo registrar la donación pendiente.");
      }
    } finally {
      setRecoveryBusy(false);
    }
  }

  const parsedAmount = parseUsdtAmount(amount);
  let disabledReason: string | null = null;
  if (amount.trim().length === 0) {
    disabledReason = null; // A1: aún no escribe nada, sin mensaje de error todavía.
  } else if (parsedAmount === null) {
    disabledReason = "Escribe un monto válido, hasta 6 decimales."; // A1
  } else if (parsedAmount <= BigInt(0)) {
    disabledReason = "El monto debe ser mayor que cero."; // A1, BR-003
  } else if (balance !== null && parsedAmount > balance) {
    disabledReason = `Saldo insuficiente. Tienes ${formatUsdt(balance)} USDT disponibles.`; // A2
  }

  const busy = stage !== "idle" && stage !== "done";
  const canSubmit =
    amount.trim().length > 0 && parsedAmount !== null && parsedAmount > BigInt(0) && !disabledReason && !busy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || parsedAmount === null) return;

    // S3-6: si la cuenta activa en la wallet no es la vinculada, no se firma nada.
    const active = await getConnectedAccount();
    if (active && active.toLowerCase() !== walletAddress.toLowerCase()) {
      setError(
        `Tu wallet tiene activa ${shortAddress(active)}, pero tu cuenta está vinculada a ${shortAddress(
          walletAddress
        )}. Cambia de cuenta en Rabby e intenta de nuevo.`
      );
      return;
    }

    setError(null);
    setSuccessRecord(null);
    setStage("approving");

    let txHash: string | null = null;
    try {
      const instruction = await requestDonateInstruction(token, cause.id, amount.trim());

      if (instruction.approve) {
        const requiredAmount = BigInt(instruction.approve.params[1]);
        const allowance = await readUsdtAllowance(walletAddress, instruction.contract);
        if (allowance < requiredAmount) {
          const approveTx = await approveUsdt(instruction.approve, walletAddress);
          await waitForReceipt(approveTx);
        }
      }

      setStage("donating");
      txHash = await donateOnChain(instruction, walletAddress);
      setPendingTxHash(txHash);
      // Se guarda antes de esperar el recibo: si se cierra la pestaña aquí, el
      // dinero ya puede haber salido de la wallet y no debe perderse (FR-025).
      addPendingDonation({
        causeId: cause.id,
        txHash,
        amount: amount.trim(),
        createdAt: new Date().toISOString(),
      });
      await waitForReceipt(txHash);

      setStage("registering");
      const record = await confirmDonation(token, cause.id, txHash);
      removePendingDonation(txHash);
      setPendingTxHash(null);
      setSuccessRecord(record);
      setStage("done");
      setAmount("");
      onDonated();
    } catch (err) {
      if (err instanceof WalletRejectedError) {
        // A3: cancelada antes de enviarse -> no se cobró nada, sin pendiente.
        setStage("idle");
        setError(err.message);
        return;
      }
      if (err instanceof CauseError && err.message === "Transaction already registered" && txHash) {
        removePendingDonation(txHash);
        setPendingTxHash(null);
        setStage("done");
        onDonated();
        return;
      }
      setStage("idle");
      setError(err instanceof WalletError || err instanceof CauseError ? err.message : "No se pudo completar la donación.");
    }
  }

  async function retryRegistration() {
    if (!pendingTxHash) return;
    setError(null);
    setStage("registering");
    try {
      const record = await confirmDonation(token, cause.id, pendingTxHash);
      removePendingDonation(pendingTxHash);
      setPendingTxHash(null);
      setSuccessRecord(record);
      setStage("done");
      setAmount("");
      onDonated();
    } catch (err) {
      setStage("idle");
      setError(err instanceof CauseError ? err.message : "No se pudo registrar la donación.");
    }
  }

  const stepIndex = stage === "approving" ? 0 : stage === "donating" ? 1 : stage === "registering" ? 2 : -1;

  return (
    <div className="border border-line p-4">
      {pending.length > 0 && (
        <div className="mb-4 border border-line bg-paper p-3">
          <p className="text-sm text-ink">Tienes una donación pendiente de registrar.</p>
          {recoveryError && <p className="mt-1 text-xs text-brick">{recoveryError}</p>}
          <button
            type="button"
            onClick={() => handleRecover(pending[0])}
            disabled={recoveryBusy}
            className="mt-2 border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink disabled:opacity-50"
          >
            {recoveryBusy ? "Registrando…" : "Registrar ahora"}
          </button>
        </div>
      )}

      {stage === "done" && successRecord ? (
        <div>
          <p className="text-sm font-medium text-emerald">
            ¡Gracias! Donaste {formatUsdtString(successRecord.amount)} USDT.
          </p>
          <a
            href={explorerTxUrl(successRecord.tx_hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs text-blueprint hover:underline"
          >
            Ver transacción ↗
          </a>
          <button
            type="button"
            onClick={() => setStage("idle")}
            className="mt-3 block border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink"
          >
            Donar otra vez
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-sm text-ink">Donar a esta causa</p>

          <div>
            <label htmlFor="donate_amount" className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase">
              Monto (USDT)
            </label>
            <input
              id="donate_amount"
              type="number"
              min="0.000001"
              step="0.000001"
              placeholder="1"
              value={amount}
              disabled={busy}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-emerald disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-ink-soft">
              {balance !== null
                ? `Saldo disponible: ${formatUsdt(balance)} USDT`
                : balanceError
                  ? balanceError
                  : "Consultando tu saldo…"}
            </p>
          </div>

          {busy && <TxStepper steps={STEPS} current={stepIndex} failed={false} />}
          {busy && (
            <p className="text-xs text-ink-soft">
              {stage === "approving" && "Autoriza en tu wallet el uso de tus USDT…"}
              {stage === "donating" && "Firma la donación en tu wallet…"}
              {stage === "registering" && "Registrando tu donación…"}
            </p>
          )}

          {disabledReason && !busy && <p className="text-xs text-brick">{disabledReason}</p>}
          {error && <p className="text-sm text-brick">{error}</p>}

          {!busy && pendingTxHash && (
            <button
              type="button"
              onClick={retryRegistration}
              className="border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink"
            >
              Reintentar registro
            </button>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-emerald px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-emerald-dark disabled:opacity-60"
          >
            {busy ? "Procesando…" : "Donar"}
          </button>
        </form>
      )}
    </div>
  );
}
