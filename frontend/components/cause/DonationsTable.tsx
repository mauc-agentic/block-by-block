import { ExplorerLink } from "@/components/ExplorerLink";
import { UsdtAmount } from "@/components/UsdtAmount";
import type { DonationItem } from "@/lib/api";
import { formatDate, shortAddress } from "@/lib/format";

// UC-008 paso 5, BR-001: cada donación enlaza a su transacción on-chain para
// verificación pública. (Tabla de Carlos Andres, adaptada a los helpers de lib/format.)
export function DonationsTable({ donations }: { donations: DonationItem[] }) {
  if (donations.length === 0) {
    return <p className="text-sm text-ink-soft">Aún no hay donaciones.</p>;
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-paper-raised text-xs tracking-wide text-ink-soft uppercase">
            <th className="px-4 py-3 font-medium">Donante</th>
            <th className="px-4 py-3 font-medium">Monto</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Transacción</th>
          </tr>
        </thead>
        <tbody>
          {donations.map((d) => (
            <tr key={d.tx_hash} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-mono text-ink-soft">
                {d.donor_wallet ? shortAddress(d.donor_wallet) : "Wallet no vinculada"}
              </td>
              <td className="px-4 py-3 text-ink">
                <UsdtAmount value={d.amount} />
              </td>
              <td className="px-4 py-3 text-ink-soft">{formatDate(d.created_at)}</td>
              <td className="px-4 py-3">
                <ExplorerLink hash={d.tx_hash} label="Ver transacción" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
