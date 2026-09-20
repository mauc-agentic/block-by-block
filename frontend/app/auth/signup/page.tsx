"use client";

// UC-001: Registrar cuenta (formulario y A3: registro con Google)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import {
  AuthError,
  googleSignup,
  signup,
  storeSession,
  type UserType,
} from "@/lib/auth";

const roles: { value: UserType; label: string; description: string }[] = [
  { value: "donor", label: "Donante", description: "Quiero apoyar causas verificadas." },
  { value: "recipient", label: "Receptor", description: "Quiero publicar una causa." },
];

export default function SignupPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userType) {
      setError("Elige si te registras como donante o receptor.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const token = await signup({ username, email, password, user_type: userType });
      storeSession(token);
      router.push("/");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "No se pudo completar el registro.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(idToken: string) {
    if (!userType) {
      setError("Elige si te registras como donante o receptor antes de continuar con Google.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const token = await googleSignup({ id_token: idToken, user_type: userType });
      storeSession(token);
      router.push("/");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "No se pudo completar el registro con Google.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Elige tu rol y regístrate para empezar a donar o publicar una causa."
    >
      <fieldset className="grid grid-cols-2 gap-3">
        <legend className="sr-only">Rol</legend>
        {roles.map((role) => (
          <label
            key={role.value}
            className={`cursor-pointer border px-3 py-3 text-sm transition-colors ${
              userType === role.value
                ? "border-blueprint bg-blueprint/10"
                : "border-line hover:border-ink"
            }`}
          >
            <input
              type="radio"
              name="user_type"
              value={role.value}
              checked={userType === role.value}
              onChange={() => setUserType(role.value)}
              className="sr-only"
            />
            <span className="block font-medium text-ink">{role.label}</span>
            <span className="mt-1 block text-xs text-ink-soft">{role.description}</span>
          </label>
        ))}
      </fieldset>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-xs font-medium tracking-wide text-ink-soft uppercase">
            Nombre de usuario
          </label>
          <input
            id="username"
            type="text"
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blueprint"
          />
        </div>

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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-blueprint"
          />
          <p className="mt-1 text-xs text-ink-soft">Mínimo 8 caracteres.</p>
        </div>

        {error && <p className="text-sm text-brick">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blueprint px-4 py-2.5 text-center text-sm font-medium text-paper transition-colors hover:bg-blueprint-dark disabled:opacity-60"
        >
          {loading ? "Creando cuenta…" : "Registrarse"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-soft">o continúa con</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton onCredential={handleGoogleCredential} text="signup_with" />

      <p className="mt-6 text-center text-sm text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/auth/login" className="font-medium text-blueprint hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthCard>
  );
}
