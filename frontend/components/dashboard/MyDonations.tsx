import Link from "next/link";
import { ExplorerLink } from "@/components/ExplorerLink";
import { UsdtAmount } from "@/components/UsdtAmount";
import type { DonorDonation } from "@/lib/api";
import { formatDate } from "@/lib/format";

// UC-011: donaciones hechas por el usuario (A1: sin donaciones).
export function MyDonations({ donations, total }: { donations: DonorDonation[]; total: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">Mis donaciones</h2>
        <p className="text-sm text-ink-soft">
          Total donado: <UsdtAmount value={total} />
        </p>
      </div>
      {donations.length === 0 ? (
        <div className="mt-4 border border-dashed border-line p-8 text-center">
          <p className="text-sm text-ink-soft">Aún no has donado.</p>
          <Link href="/causes" className="mt-2 inline-block text-sm font-medium text-blueprint hover:underline">
            Explorar causas
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line border border-line">
          {donations.map((d) => (
            <li key={d.tx_hash} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <Link href={`/cause/${d.cause_id}`} className="font-medium text-ink hover:underline">
                {d.cause_title}
              </Link>
              <UsdtAmount value={d.amount} />
              <span className="text-xs text-ink-soft">{formatDate(d.created_at)}</span>
              <ExplorerLink hash={d.tx_hash} label="Ver transacción" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
