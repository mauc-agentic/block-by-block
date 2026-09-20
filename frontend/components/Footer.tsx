"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function Footer() {
  const { t } = useT();
  return (
    <footer className="mt-auto border-t border-edge bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-semibold text-fg">Block by Block</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-soft">
            <Link href="/faq" className="transition-colors hover:text-fg">
              {t("footer.faq")}
            </Link>
            <Link href="/terms" className="transition-colors hover:text-fg">
              {t("footer.terms")}
            </Link>
          </nav>
        </div>
        <p className="text-sm text-fg-soft">{t("footer.note")}</p>
      </div>
    </footer>
  );
}
