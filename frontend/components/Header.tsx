"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/#causas", label: "Causas" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/faq", label: "Preguntas frecuentes" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
            priority
          />
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            Block by Block
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/auth/signup"
            className="bg-blueprint px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-blueprint-dark"
          >
            Registrarse
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center border border-line md:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">Menú</span>
          <div className="flex flex-col gap-1.5">
            <span
              className={`h-0.5 w-5 bg-ink transition-transform ${menuOpen ? "translate-y-2 rotate-45" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-ink transition-opacity ${menuOpen ? "opacity-0" : ""}`}
            />
            <span
              className={`h-0.5 w-5 bg-ink transition-transform ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </div>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm px-2 py-2 text-sm text-ink-soft hover:bg-paper-raised hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              className="rounded-sm px-2 py-2 text-sm text-ink-soft hover:bg-paper-raised hover:text-ink"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/auth/signup"
              className="mt-1 bg-blueprint px-4 py-2 text-center text-sm font-medium text-paper hover:bg-blueprint-dark"
            >
              Registrarse
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
