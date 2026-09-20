"use client";

// UC-011: Ver dashboard.
// Ruta protegida en el cliente: sin JWT en localStorage se redirige a
// /auth/login. El token se valida contra el backend en la primera petición
// (GET /users/me/dashboard); si el backend lo rechaza (401/403), se limpia
// la sesión y se redirige igual. Es una decisión de MVP: no hay cookies ni
// middleware de servidor todavía (ver CLAUDE.md).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MyCauseRow } from "@/components/dashboard/MyCauseRow";
import { MyDonations } from "@/components/dashboard/MyDonations";
import { WalletAlert } from "@/components/dashboard/WalletAlert";
import { ApiError, fetchDashboard, type Dashboard } from "@/lib/api";
import { clearSession, getStoredToken } from "@/lib/auth";
import { WalletError, watchUsdt } from "@/lib/wallet";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchDashboard()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.sessionExpired) {
          router.replace("/auth/login");
          return;
        }
        setError(err instanceof Error ? err.message : "No se pudo cargar tu dashboard.");
      });
  }, [router]);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/auth/login");
      return;
    }
    load();
  }, [router, load]);

  async function handleWatchAsset() {
    try {
      await watchUsdt();
      setTokenMessage("Listo: revisa tu wallet para agregar USDT.");
    } catch (err) {
      setTokenMessage(err instanceof WalletError ? err.message : "No se pudo agregar el token.");
    }
  }

  function handleLogout() {
    clearSession();
    router.push("/auth/login");
  }

  if (error) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm text-brick">{error}</p>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm text-ink-soft">Cargando tu dashboard…</p>
      </section>
    );
  }

  const { user, causes } = data;

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Hola, {user.username}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => void handleWatchAsset()}
            className="border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Ver USDT en mi wallet
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      {tokenMessage && <p className="mt-2 text-xs text-ink-soft">{tokenMessage}</p>}

      {!data.wallet_linked && (
        <div className="mt-6">
          <WalletAlert />
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">Mis causas</h2>
        <Link
          href="/cause/create"
          className="shrink-0 bg-blueprint px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-blueprint-dark"
        >
          + Crear causa
        </Link>
      </div>

      {causes.length === 0 ? (
        <div className="mt-4 border border-dashed border-line p-8 text-center">
          <p className="text-sm text-ink-soft">
            Todavía no has creado ninguna causa. Publica la tuya para empezar a
            recibir donaciones verificadas.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {causes.map((cause) => (
            <MyCauseRow key={cause.id} cause={cause} walletAddress={user.wallet_address} onChanged={load} />
          ))}
        </div>
      )}

      <div className="mt-14">
        <MyDonations donations={data.donations} total={data.total_donated} />
      </div>
    </section>
  );
}
