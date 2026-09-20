"use client";

import { useT, type MessageKey } from "@/lib/i18n";

const steps: { t: MessageKey; d: MessageKey }[] = [
  { t: "how.s1.t", d: "how.s1.d" },
  { t: "how.s2.t", d: "how.s2.d" },
  { t: "how.s3.t", d: "how.s3.d" },
  { t: "how.s4.t", d: "how.s4.d" },
];

export function HowItWorks() {
  const { t } = useT();
  return (
    <section
      id="como-funciona"
      className="border-t border-edge bg-surface"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          {t("how.title")}
        </h2>

        <div className="mt-12">
          <div className="hidden sm:grid sm:grid-cols-4 sm:gap-6">
            {steps.map((_, i) => (
              <div key={i} className="flex items-center">
                <span className="h-3 w-3 shrink-0 bg-eag-primary" />
                {i < steps.length - 1 && (
                  <span className="ml-2 h-0.5 flex-1 bg-edge" />
                )}
              </div>
            ))}
          </div>

          <ol className="grid gap-8 sm:mt-4 sm:grid-cols-4 sm:gap-6">
            {steps.map((step) => (
              <li key={step.t} className="flex gap-3 sm:block">
                <span className="mt-1.5 h-3 w-3 shrink-0 bg-eag-primary sm:hidden" />
                <div>
                  <h3 className="font-display text-xl font-semibold text-fg">
                    {t(step.t)}
                  </h3>
                  <p className="mt-1 text-sm text-fg-soft">
                    {t(step.d)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
