"use client";

// UC-003: Vincular wallet

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { WalletLinkCard } from "@/components/wallet/WalletLinkCard";
import { getStoredToken } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function WalletPage() {
  const { t } = useT();
  const router = useRouter();
  const [token] = useState(() => getStoredToken());

  useEffect(() => {
    if (!token) router.replace("/auth/login");
  }, [token, router]);

  if (!token) return null;

  return (
    <AuthCard title={t("wallet.title")} subtitle={t("wallet.subtitle")}>
      <WalletLinkCard />
    </AuthCard>
  );
}
