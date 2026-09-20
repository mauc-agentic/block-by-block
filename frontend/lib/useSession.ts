"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AUTH_CHANGE_EVENT, getStoredUser, type AuthUser } from "@/lib/auth";

function subscribe(onChange: () => void) {
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function snapshot(): string | null {
  try {
    return localStorage.getItem("bbb_user");
  } catch {
    return null;
  }
}

/** Usuario de la sesión local (null en el servidor y sin sesión); se actualiza con login/logout. */
export function useSessionUser(): AuthUser | null {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `raw` es la clave de invalidación
  return useMemo(() => getStoredUser(), [raw]);
}
