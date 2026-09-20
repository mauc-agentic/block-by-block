"use client";

import Link from "next/link";
import { ExplorerLink } from "@/components/ExplorerLink";
import { UsdtAmount } from "@/components/UsdtAmount";
import type { DonorDonation } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n";

// UC-011: donaciones hechas por el usuario (A1: sin donaciones).
export function MyDonations({ donations, total }: { donations: DonorDonation[]; total: string }) {
  const { t } = useT();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-fg">{t("mydon.title")}</h2>
        <p className="text-sm text-fg-soft">
          {t("mydon.total")} <UsdtAmount value={total} />
        </p>
      </div>
      {donations.length === 0 ? (
        <div className="mt-4 border border-dashed border-edge p-8 text-center rounded-lg">
          <p className="text-sm text-fg-soft">{t("mydon.empty")}</p>
          <Link href="/causes" className="mt-2 inline-block text-sm font-medium text-eag-secondary hover:underline">
            {t("mydon.explore")}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-edge border border-edge rounded-lg overflow-hidden">
          {donations.map((d) => (
            <li key={d.tx_hash} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <Link href={`/cause/${d.cause_id}`} className="font-medium text-fg hover:underline">
                {d.cause_title}
              </Link>
              <UsdtAmount value={d.amount} />
              <span className="text-xs text-fg-soft">{formatDate(d.created_at)}</span>
              <ExplorerLink hash={d.tx_hash} label={t("common.viewTx")} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
