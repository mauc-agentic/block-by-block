"use client";

import { useT, type MessageKey } from "@/lib/i18n";

const STYLES: Record<string, string> = {
  Pending: "border-info/50 bg-info/10 text-info",
  Verified: "border-ok/50 bg-ok/10 text-ok",
  Rejected: "border-danger/50 bg-danger/10 text-danger",
  Completed: "border-eth-primary/50 bg-eth-primary/10 text-eth-secondary",
};

export function CauseStatusBadge({ status }: { status: string }) {
  const { t } = useT();
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? "border-edge text-fg-soft"}`}
    >
      {STYLES[status] ? t(`status.${status}` as MessageKey) : status}
    </span>
  );
}
