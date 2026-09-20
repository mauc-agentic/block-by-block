import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-semibold text-ink">
            Block by Block
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            <Link href="/faq" className="hover:text-ink">
              Preguntas frecuentes
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Términos y condiciones
            </Link>
          </nav>
        </div>
        <p className="text-sm text-ink-soft">
          Donaciones on-chain, verificadas por IA. HSK Chain testnet — MVP de
          hackathon, sin valor monetario real.
        </p>
      </div>
    </footer>
  );
}
