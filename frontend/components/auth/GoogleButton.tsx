"use client";

// UC-001 A3, UC-002 A3 — botón de Google Identity Services.
// Renderiza el botón oficial de Google y entrega el ID token al callback
// del caller, que lo envía al backend para verificarlo (nunca lo validamos
// en el cliente: solo el backend confía en la firma de Google).

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: Record<string, string | number>
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

type GoogleButtonProps = {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
};

export function GoogleButton({ onCredential, text = "continue_with" }: GoogleButtonProps) {
  const { lang } = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const renderButton = useCallback(() => {
    if (!clientId || !window.google || !containerRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    });

    containerRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text,
      width: 320,
      locale: lang,
    });
  }, [clientId, onCredential, text, lang]);

  useEffect(() => {
    if (scriptReady) renderButton();
  }, [scriptReady, renderButton]);

  if (!clientId) {
    return null;
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="flex justify-center" />
    </>
  );
}
