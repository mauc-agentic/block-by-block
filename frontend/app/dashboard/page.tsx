"use client";

// UC-011: Ver dashboard.
// Ruta protegida en el cliente: sin JWT en localStorage se redirige a
// /auth/login. El token se valida contra el backend en la primera petición
// (GET /users/me/dashboard); si el backend lo rechaza (401/403), se limpia
// la sesión y se redirige igual. Es una decisión de MVP: no hay cookies ni
// middleware de servidor todavía (ver CLAUDE.md).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AuthError,
  SessionExpiredError,
  clearSession,
  getMyDashboard,
  getStoredToken,
  type AuthUser,
  type DashboardCause,
} from "@/lib/auth";
import { fetchVerifiedCauses, type VerifiedCause } from "@/lib/causes";
import { WalletAlert } from "@/components/dashboard/WalletAlert";
import { MyCauseRow } from "@/components/dashboard/MyCauseRow";
import { DonateCauseCard } from "@/components/dashboard/DonateCauseCard";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [myCauses, setMyCauses] = useState<DashboardCause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verifiedCauses, setVerifiedCauses] = useState<VerifiedCause[]>([]);
  const [verifiedError, setVerifiedError] = useState<string | null>(null);
  const [verifiedLoading, setVerifiedLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    getMyDashboard(token)
      .then((data) => {
        setUser(data.user);
        setMyCauses(data.causes);
      })
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          router.replace("/auth/login");
          return;
        }
        setError(
          err instanceof AuthError ? err.message : "No se pudo cargar tu dashboard."
        );
      })
      .finally(() => setLoading(false));

    fetchVerifiedCauses()
      .then(setVerifiedCauses)
      .catch(() => setVerifiedError("No se pudieron cargar las causas verificadas."))
      .finally(() => setVerifiedLoading(false));
  }, [router]);

  function handleLogout() {
    clearSession();
    router.push("/auth/login");
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm text-ink-soft">Cargando tu dashboard…</p>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm text-brick">{error ?? "No se pudo cargar tu dashboard."}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Hola, {user.username}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="self-start border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink sm:self-center"
        >
          Cerrar sesión
        </button>
      </div>

      {!user.wallet_address && (
        <div className="mt-6">
          <WalletAlert />
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold text-ink">Tus causas</h2>
        <Link
          href="/cause/create"
          className="shrink-0 bg-blueprint px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-blueprint-dark"
        >
          + Crear causa
        </Link>
      </div>

      {myCauses.length === 0 ? (
        <div className="mt-4 border border-dashed border-line p-8 text-center">
          <p className="text-sm text-ink-soft">
            Todavía no has creado ninguna causa. Publica la tuya para empezar a
            recibir donaciones verificadas.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {myCauses.map((cause) => (
            <MyCauseRow key={cause.id} cause={cause} />
          ))}
        </div>
      )}

      <div className="mt-14">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Causas verificadas para donar
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Cada causa pasó por verificación de IA antes de poder recibir
          donaciones (UC-006, UC-007).
        </p>

        {verifiedLoading ? (
          <p className="mt-4 text-sm text-ink-soft">Cargando causas…</p>
        ) : verifiedError ? (
          <p className="mt-4 text-sm text-brick">{verifiedError}</p>
        ) : verifiedCauses.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            Todavía no hay causas verificadas disponibles.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {verifiedCauses.map((cause) => (
              <DonateCauseCard key={cause.id} cause={cause} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
