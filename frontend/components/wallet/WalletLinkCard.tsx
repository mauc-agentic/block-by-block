"use client";

// UC-003 — vincular wallet (Rabby u otra wallet compatible con EIP-1193).

import { useState } from "react";
import { getStoredUser, updateStoredUser } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { WalletError, linkWallet } from "@/lib/wallet";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletLinkCard() {
  const { t } = useT();
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
      setError(err instanceof WalletError ? err.message : t("wallet.linkFail"));
    } finally {
      setLoading(false);
    }
  }

  if (walletAddress) {
    return (
      <div className="border border-edge bg-surface rounded-lg p-6">
        <p className="text-xs font-medium tracking-wide text-fg-soft uppercase">{t("wallet.linked")}</p>
        <p className="mt-2 font-mono text-sm text-fg">{shortAddress(walletAddress)}</p>
      </div>
    );
  }

  return (
    <div className="border border-edge bg-surface rounded-lg p-6">
      <p className="text-sm text-fg-soft">
        {t("wallet.explain")}
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="mt-4 bg-eag-gradient rounded-sm px-4 py-2.5 text-center text-sm font-medium text-canvas transition-colors hover:brightness-110 disabled:opacity-60"
      >
        {loading ? t("wallet.connecting") : t("wallet.connect")}
      </button>

      <p className="mt-3 text-xs text-fg-soft">
        {t("wallet.noRabby")}{" "}
        <a
          href="https://rabby.io"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-eag-secondary hover:underline"
        >
          {t("wallet.install")}
        </a>
        .
      </p>
    </div>
  );
}
