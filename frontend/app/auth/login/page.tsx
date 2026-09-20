"use client";

// UC-002: Iniciar sesión (formulario y A3: login con Google)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthError, googleLogin, login, storeSession } from "@/lib/auth";
import { useT } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login({ email, password });
      storeSession(token);
      router.push("/dashboard");
    } catch (err) {
      // BR-001: mensaje genérico, sin indicar cuál dato falló
      setError(err instanceof AuthError ? err.message : t("login.errInvalid"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(idToken: string) {
    setError(null);
    setLoading(true);
    try {
      const token = await googleLogin({ id_token: idToken });
      storeSession(token);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : t("login.errGoogle")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("login.title")} subtitle={t("login.subtitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase">
            {t("common.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase">
            {t("common.password")}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-eag-gradient rounded-sm px-4 py-2.5 text-center text-sm font-medium text-canvas transition-colors hover:brightness-110 disabled:opacity-60"
        >
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-edge" />
        <span className="text-xs text-fg-soft">{t("common.orContinue")}</span>
        <div className="h-px flex-1 bg-edge" />
      </div>

      <GoogleButton onCredential={handleGoogleCredential} text="signin_with" />

      <p className="mt-6 text-center text-sm text-fg-soft">
        {t("login.noAccount")}{" "}
        <Link href="/auth/signup" className="font-medium text-eag-secondary hover:underline">
          {t("login.signupLink")}
        </Link>
      </p>
    </AuthCard>
  );
}
