"use client";

// UC-002: Iniciar sesión (formulario y A3: login con Google)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { AuthError, googleLogin, login, storeSession } from "@/lib/auth";

export default function LoginPage() {
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
      router.push("/");
    } catch (err) {
      // BR-001: mensaje genérico, sin indicar cuál dato falló
      setError(err instanceof AuthError ? err.message : "Credenciales inválidas.");
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
      router.push("/");
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : "No encontramos una cuenta con esa identidad de Google."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Inicia sesión" subtitle="Accede a tu dashboard como donante o receptor.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase">
            Correo
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blueprint"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blueprint"
          />
        </div>

        {error && <p className="text-sm text-brick">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blueprint px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-blueprint-dark disabled:opacity-60"
        >
          {loading ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-soft">o continúa con</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton onCredential={handleGoogleCredential} text="signin_with" />

      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿No tienes cuenta?{" "}
        <Link href="/auth/signup" className="font-medium text-blueprint hover:underline">
          Regístrate
        </Link>
      </p>
    </AuthCard>
  );
}
