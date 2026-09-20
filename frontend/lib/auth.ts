// UC-001, UC-002 — cliente de autenticación (email/contraseña y Google)
// Cualquier cuenta puede donar y publicar causas; no hay un rol fijo por cuenta.

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  auth_provider: "local" | "google";
  wallet_address: string | null;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class AuthError extends Error {}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthError("No se pudo conectar con el servidor. Intenta de nuevo.");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new AuthError(data?.detail ?? "Ocurrió un error, intenta de nuevo.");
  }

  return res.json();
}

export function signup(input: {
  username: string;
  email: string;
  password: string;
}) {
  return postJson<TokenResponse>("/auth/signup", input);
}

export function login(input: { email: string; password: string }) {
  return postJson<TokenResponse>("/auth/login", input);
}

export function googleSignup(input: { id_token: string }) {
  return postJson<TokenResponse>("/auth/google/signup", input);
}

export function googleLogin(input: { id_token: string }) {
  return postJson<TokenResponse>("/auth/google/login", input);
}

const TOKEN_KEY = "bbb_token";
const USER_KEY = "bbb_user";

// Evento local para que componentes como el Header reaccionen al login/logout
// sin recargar la página (el "storage" nativo del navegador no se dispara en
// la misma pestaña que hizo el cambio).
export const AUTH_CHANGE_EVENT = "bbb-auth-change";

function notifyAuthChange() {
  try {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    // no-op (SSR o entorno sin window)
  }
}

export function storeSession(token: TokenResponse) {
  try {
    localStorage.setItem(TOKEN_KEY, token.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(token.user));
  } catch {
    // localStorage puede no estar disponible (modo privado); la sesión no persiste
    // entre recargas, pero el flujo de autenticación en curso sigue funcionando.
  }
  notifyAuthChange();
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getStoredToken() !== null;
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // no-op
  }
  notifyAuthChange();
}

// Distingue "sesión inválida/expirada" (debe redirigir a login) de cualquier
// otro fallo (red caída, 500, etc.), que solo debe mostrarse como error.
export class SessionExpiredError extends AuthError {}

async function authorizedGet<T>(path: string, token: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AuthError("No se pudo conectar con el servidor. Intenta de nuevo.");
  }

  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new SessionExpiredError("Tu sesión expiró, inicia sesión de nuevo.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new AuthError(data?.detail ?? "Ocurrió un error, intenta de nuevo.");
  }

  return res.json();
}

// UC-011: dashboard del usuario autenticado (causas propias + estado de wallet)
export function getMyDashboard(token: string) {
  return authorizedGet<{ user: AuthUser; causes: DashboardCause[] }>(
    "/users/me/dashboard",
    token
  );
}

export type DashboardCause = {
  id: number;
  recipient_id: number;
  onchain_cause_id: number | null;
  title: string;
  description: string;
  image_hash: string | null;
  target_amount: string | number;
  status: "Pending" | "Verified" | "Rejected" | "Completed";
  verification_hash: string | null;
  created_at: string;
};
