import type { DonationItem } from "@/lib/causes";
import { explorerTxUrl } from "@/lib/causes";

function shortAddress(address: string | null): string {
  if (!address) return "Wallet no vinculada";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// UC-008 paso 5, BR-001: cada donación enlaza a su transacción on-chain para
// verificación pública.
export function DonationsTable({ donations }: { donations: DonationItem[] }) {
  if (donations.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Todavía no hay donaciones registradas para esta causa.
      </p>
    );
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
          {donations.map((donation) => (
            <tr key={donation.tx_hash} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-mono text-ink-soft">
                {shortAddress(donation.donor_wallet)}
              </td>
              <td className="px-4 py-3 font-mono text-ink">
                ${Number(donation.amount).toLocaleString("es-CO")} USDT
              </td>
              <td className="px-4 py-3 text-ink-soft">{formatDate(donation.created_at)}</td>
              <td className="px-4 py-3">
                <a
                  href={explorerTxUrl(donation.tx_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blueprint hover:underline"
                >
                  {shortHash(donation.tx_hash)} ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
