// UC-011 A3: aviso cuando el usuario no tiene wallet vinculada.
// La vinculación (UC-003) se hace desde su propio flujo; aquí solo se avisa.

import Link from "next/link";

export function WalletAlert() {
  return (
    <div className="flex flex-col gap-2 border border-brick/40 bg-brick/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink">
          No tienes una wallet vinculada
        </p>
        <p className="mt-0.5 text-sm text-ink-soft">
          Necesitas vincular una wallet para publicar causas y donar (UC-003).
        </p>
      </div>
      <Link
        href="/wallet"
        className="shrink-0 self-start rounded-full border border-brick/50 px-3 py-1 text-xs font-medium text-brick transition-colors hover:bg-brick/10 sm:self-center"
      >
        Vincular wallet
      </Link>
    </div>
  );
}
