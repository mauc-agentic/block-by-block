"use client";

// UC-001: Registrar cuenta (formulario y A3: registro con Google)
// Cualquier cuenta puede donar y publicar causas; no se elige un rol al registrarse.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/lib/i18n";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthError, googleSignup, signup, storeSession } from "@/lib/auth";

export default function SignupPage() {
  const { t } = useT();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await signup({ username, email, password });
      storeSession(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : t("signup.err"));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(idToken: string) {
    setError(null);
    setLoading(true);
    try {
      const token = await googleSignup({ id_token: idToken });
      storeSession(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : t("signup.errGoogle"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={t("signup.title")}
      subtitle={t("signup.subtitle")}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-xs font-medium tracking-wide text-fg-soft uppercase">
            {t("common.username")}
          </label>
          <input
            id="username"
            type="text"
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
        </div>

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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-fg-muted bg-canvas-2 px-3 py-2 text-sm text-fg outline-none transition-colors focus:border-eag-secondary focus:ring-2 focus:ring-eag-secondary/25 rounded-sm"
          />
          <p className="mt-1 text-xs text-fg-soft">{t("signup.passwordHint")}</p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-eag-gradient rounded-sm px-4 py-2.5 text-center text-sm font-medium text-canvas transition-colors hover:brightness-110 disabled:opacity-60"
        >
          {loading ? t("signup.submitting") : t("nav.signup")}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-edge" />
        <span className="text-xs text-fg-soft">{t("common.orContinue")}</span>
        <div className="h-px flex-1 bg-edge" />
      </div>

      <GoogleButton onCredential={handleGoogleCredential} text="signup_with" />

      <p className="mt-6 text-center text-sm text-fg-soft">
        {t("signup.haveAccount")}{" "}
        <Link href="/auth/login" className="font-medium text-eag-secondary hover:underline">
          {t("signup.loginLink")}
        </Link>
      </p>
    </AuthCard>
  );
}
