"use client";

import { ExplorerLink } from "@/components/ExplorerLink";
import { UsdtAmount } from "@/components/UsdtAmount";
import type { DonationItem } from "@/lib/api";
import { formatDate, shortAddress } from "@/lib/format";
import { useT } from "@/lib/i18n";

// UC-008 paso 5, BR-001: cada donación enlaza a su transacción on-chain para
// verificación pública. (Tabla de Carlos Andres, adaptada a los helpers de lib/format.)
export function DonationsTable({ donations }: { donations: DonationItem[] }) {
  const { t } = useT();
  if (donations.length === 0) {
    return <p className="text-sm text-fg-soft">{t("don.empty")}</p>;
  }

  return (
    <div className="overflow-x-auto border border-edge rounded-lg">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-edge bg-surface text-xs tracking-wide text-fg-soft uppercase">
            <th className="px-4 py-3 font-medium">{t("don.donor")}</th>
            <th className="px-4 py-3 font-medium">{t("don.amount")}</th>
            <th className="px-4 py-3 font-medium">{t("don.date")}</th>
            <th className="px-4 py-3 font-medium">{t("don.tx")}</th>
          </tr>
        </thead>
        <tbody>
          {donations.map((d) => (
            <tr key={d.tx_hash} className="border-b border-edge last:border-0">
              <td className="px-4 py-3 font-mono text-fg-soft">
                {d.donor_wallet ? shortAddress(d.donor_wallet) : t("don.noWallet")}
              </td>
              <td className="px-4 py-3 text-fg">
                <UsdtAmount value={d.amount} />
              </td>
              <td className="px-4 py-3 text-fg-soft">{formatDate(d.created_at)}</td>
              <td className="px-4 py-3">
                <ExplorerLink hash={d.tx_hash} label={t("common.viewTx")} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
