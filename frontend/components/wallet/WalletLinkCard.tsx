"use client";

// UC-003 — vincular wallet (Rabby u otra wallet compatible con EIP-1193).

import { useState } from "react";
import { getStoredUser, updateStoredUser } from "@/lib/auth";
import { WalletError, linkWallet } from "@/lib/wallet";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletLinkCard() {
  const [walletAddress, setWalletAddress] = useState<string | null>(
    () => getStoredUser()?.wallet_address ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const user = await linkWallet();
      updateStoredUser(user);
      setWalletAddress(user.wallet_address);
    } catch (err) {
      setError(err instanceof WalletError ? err.message : "No se pudo vincular la wallet.");
    } finally {
      setLoading(false);
    }
  }

  if (walletAddress) {
    return (
      <div className="border border-line bg-paper-raised p-6">
        <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">Wallet vinculada</p>
        <p className="mt-2 font-mono text-sm text-ink">{shortAddress(walletAddress)}</p>
      </div>
    );
  }

  return (
    <div className="border border-line bg-paper-raised p-6">
      <p className="text-sm text-ink-soft">
        Conecta tu wallet Rabby para donar o recibir fondos. Vas a firmar un mensaje para
        demostrar que la controlas; esto no mueve fondos ni cuesta gas.
      </p>

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}

      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="mt-4 bg-emerald px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-emerald-dark disabled:opacity-60"
      >
        {loading ? "Conectando…" : "Conectar wallet"}
      </button>

      <p className="mt-3 text-xs text-ink-soft">
        ¿No tienes Rabby?{" "}
        <a
          href="https://rabby.io"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-emerald hover:underline"
        >
          Instálala aquí
        </a>
        .
      </p>
    </div>
  );
}
