// UC-011 A3: aviso cuando el usuario no tiene wallet vinculada.
// La vinculación (UC-003) se hace desde su propio flujo; aquí solo se avisa.

"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function WalletAlert() {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2 border border-danger/40 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between rounded-lg">
      <div>
        <p className="text-sm font-medium text-fg">
          {t("walletAlert.title")}
        </p>
        <p className="mt-0.5 text-sm text-fg-soft">
          {t("walletAlert.body")}
        </p>
      </div>
      <Link
        href="/wallet"
        className="shrink-0 self-start rounded-full border border-danger/50 px-3 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/10 sm:self-center"
      >
        {t("walletAlert.link")}
      </Link>
    </div>
  );
}
