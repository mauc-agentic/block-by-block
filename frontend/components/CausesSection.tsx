"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listVerifiedCauses, type CauseListItem } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { CauseListCard } from "./CauseListCard";

// UC-007 A1: solo causas verificadas reales; sin ninguna, se muestra el mensaje
// de vacío, nunca causas de ejemplo (D2, GAP-041).
export function CausesSection() {
  const { t } = useT();
  const [causes, setCauses] = useState<CauseListItem[] | null>(null);

  useEffect(() => {
    listVerifiedCauses()
      .then((list) => setCauses(list.slice(0, 6)))
      .catch(() => setCauses([]));
  }, []);

  return (
    <section id="causas" className="border-t border-edge bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
              {t("causes.title")}
            </h2>
            <p className="mt-3 max-w-lg text-fg-soft">{t("causes.lead")}</p>
          </div>
          <Link
            href="/causes"
            className="shrink-0 text-sm font-medium text-eag-secondary transition-colors hover:text-eag-accent"
          >
            {t("causes.all")}
          </Link>
        </div>

        {causes === null ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("causes.loadingAria")}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-lg border border-edge bg-surface" />
            ))}
          </div>
        ) : causes.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-edge p-8 text-center text-sm text-fg-soft">
            {t("causes.empty")}
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {causes.map((cause) => (
              <CauseListCard key={cause.id} cause={cause} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
