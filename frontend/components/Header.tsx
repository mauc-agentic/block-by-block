"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { clearSession, getStoredUser, type AuthUser } from "@/lib/auth";
import { useT, type MessageKey } from "@/lib/i18n";

const navLinks: { href: string; label: MessageKey }[] = [
  { href: "/causes", label: "nav.causes" },
  { href: "/#como-funciona", label: "nav.how" },
  { href: "/faq", label: "nav.faq" },
];

export function Header() {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  // Vuelve a leer la sesión cuando cambia la ruta (p.ej. tras login/logout,
  // que no remontan el header) para reflejar el estado actual.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setUser(getStoredUser());
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  }

  const inDashboard = pathname.startsWith("/dashboard");
  const sessionLink = inDashboard
    ? { href: "/wallet", label: t("nav.wallet") }
    : { href: "/dashboard", label: t("nav.dashboard") };

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-2xl font-semibold tracking-tight text-fg">
            Block by Block
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-fg-soft transition-colors hover:text-fg"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          {user ? (
            <>
              <Link
                href={sessionLink.href}
                className="text-sm font-medium text-fg-soft transition-colors hover:text-fg"
              >
                {sessionLink.label}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm font-medium text-fg-soft transition-colors hover:text-fg"
              >
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-fg-soft transition-colors hover:text-fg"
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/auth/signup"
                className="bg-eag-gradient rounded-sm px-4 py-2 text-sm font-medium text-canvas transition-colors hover:brightness-110"
              >
                {t("nav.signup")}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center border border-edge md:hidden rounded-lg"
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{t("nav.menu")}</span>
          <div className="flex flex-col gap-1.5">
            <span
              className={`h-0.5 w-5 bg-fg transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-fg transition-opacity ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-fg transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </div>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-edge px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm px-2 py-2 text-sm text-fg-soft hover:bg-surface hover:text-fg"
                onClick={() => setMenuOpen(false)}
              >
                {t(link.label)}
              </Link>
            ))}
            <div className="px-2 py-2"><LanguageSwitcher /></div>
            {user ? (
              <>
                <Link
                  href={sessionLink.href}
                  className="rounded-sm px-2 py-2 text-sm text-fg-soft hover:bg-surface hover:text-fg"
                  onClick={() => setMenuOpen(false)}
                >
                  {sessionLink.label}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-sm px-2 py-2 text-left text-sm text-fg-soft hover:bg-surface hover:text-fg"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-sm px-2 py-2 text-sm text-fg-soft hover:bg-surface hover:text-fg"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href="/auth/signup"
                  className="mt-1 bg-eag-gradient rounded-sm px-4 py-2 text-center text-sm font-medium text-canvas hover:brightness-110"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("nav.signup")}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
