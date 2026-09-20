"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const columns = [
  { blocks: 3, color: "bg-eag-primary" },
  { blocks: 6, color: "bg-eth-primary" },
  { blocks: 4, color: "bg-hsk-primary" },
  { blocks: 7, color: "bg-eag-primary" },
  { blocks: 5, color: "bg-eth-primary" },
];

function BlockStack() {
  return (
    <div
      className="flex h-64 items-end justify-center gap-2 sm:h-80 lg:h-96"
      aria-hidden="true"
    >
      {columns.map((column, i) => (
        <div key={i} className="flex w-10 flex-col-reverse gap-1 sm:w-12">
          {Array.from({ length: column.blocks }, (_, j) => (
            <div key={j} className={`aspect-square w-full ${column.color}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  const { t } = useT();
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-28">
      <div>
        <h1 className="font-display text-4xl leading-[1.1] font-semibold tracking-tight text-fg sm:text-6xl lg:text-6xl">
          {t("hero.title1")}
          <br />
          <span className="text-eag-gradient">{t("hero.title2")}</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-fg-soft">
          {t("hero.lead")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="bg-eag-gradient rounded-sm px-6 py-3 text-center font-medium text-canvas transition-colors hover:brightness-110"
          >
            {t("nav.signup")}
          </Link>
          <a
            href="#causas"
            className="border border-edge px-6 py-3 text-center font-medium text-fg transition-colors hover:border-eag-secondary hover:bg-eag-primary/10 rounded-sm"
          >
            {t("hero.explore")}
          </a>
        </div>
        <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-edge pt-6">
          <div>
            <dt className="text-sm text-fg-soft">{t("hero.fee")}</dt>
            <dd className="font-display text-3xl font-semibold text-fg">
              0%
            </dd>
          </div>
          <div>
            <dt className="text-sm text-fg-soft">{t("hero.network")}</dt>
            <dd className="font-display text-3xl font-semibold text-fg">
              HSK
            </dd>
          </div>
          <div>
            <dt className="text-sm text-fg-soft">{t("hero.currency")}</dt>
            <dd className="font-display text-3xl font-semibold text-fg">
              USDT
            </dd>
          </div>
        </dl>
      </div>

      <BlockStack />
    </section>
  );
}
