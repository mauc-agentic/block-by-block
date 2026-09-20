"use client";

import Link from "next/link";
import { faqs } from "@/lib/i18n/content";
import { useT } from "@/lib/i18n";

export default function FaqPage() {
  const { t, lang } = useT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
        {t("faq.title")}
      </h1>
      <p className="mt-4 max-w-xl text-fg-soft">
        {t("faq.lead1")}{" "}
        <Link href="/terms" className="text-eag-secondary hover:text-eag-accent">
          {t("faq.termsLink")}
        </Link>{" "}
        {t("faq.lead2")}
      </p>

      <dl className="mt-12 divide-y divide-edge border-t border-edge">
        {faqs[lang].map((faq) => (
          <div key={faq.q} className="py-6">
            <dt className="font-display text-xl font-semibold text-fg">{faq.q}</dt>
            <dd className="mt-2 text-fg-soft">{faq.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
