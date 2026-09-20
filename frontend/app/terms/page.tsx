"use client";

import { termsSections } from "@/lib/i18n/content";
import { useT } from "@/lib/i18n";

export default function TermsPage() {
  const { t, lang } = useT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
        {t("terms.title")}
      </h1>
      <p className="mt-4 text-fg-soft">{t("terms.updated")}</p>

      <div className="mt-12 space-y-10 border-t border-edge pt-10">
        {termsSections[lang].map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-2xl font-semibold text-fg">{section.title}</h2>
            <div className="mt-3 space-y-3 text-fg-soft">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
