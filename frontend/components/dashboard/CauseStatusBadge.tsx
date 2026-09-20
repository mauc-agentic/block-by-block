const STYLES: Record<string, string> = {
  Pending: "border-line text-ink-soft",
  Verified: "border-moss/50 bg-moss/10 text-moss",
  Rejected: "border-brick/50 bg-brick/10 text-brick",
  Completed: "border-blueprint/50 bg-blueprint/10 text-blueprint",
};

const LABELS: Record<string, string> = {
  Pending: "En verificación",
  Verified: "Verificada",
  Rejected: "Rechazada",
  Completed: "Completada",
};

export function CauseStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? "border-line text-ink-soft"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
