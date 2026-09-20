import Link from "next/link";

// Cada columna representa causas creciendo a ritmos distintos: la mezcla de
// esmeralda (predominante) y ámbar transmite la misma idea que el resto del
// producto — dar hace crecer la causa, bloque por bloque.
const columns = [
  { blocks: 4, color: "bg-emerald" },
  { blocks: 7, color: "bg-amber" },
  { blocks: 5, color: "bg-emerald-dark" },
  { blocks: 8, color: "bg-emerald" },
  { blocks: 6, color: "bg-amber" },
];

function BlockStack() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute inset-x-8 top-1/2 h-56 -translate-y-1/2 rounded-full bg-emerald/20 blur-3xl" />
      <div className="relative flex h-64 items-end justify-center gap-2 sm:h-80 lg:h-96">
        {columns.map((column, i) => (
          <div key={i} className="flex w-10 flex-col-reverse gap-1 sm:w-12">
            {Array.from({ length: column.blocks }, (_, j) => (
              <div
                key={j}
                className={`aspect-square w-full rounded-[2px] shadow-[inset_0_2px_0_rgba(255,255,255,0.25)] ${column.color}`}
                style={{
                  animation: "rise-in 0.5s ease-out backwards",
                  animationDelay: `${i * 90 + j * 45}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="bg-[linear-gradient(180deg,var(--color-paper-deep)_0%,var(--color-paper)_75%)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-28">
        <div>
          <h1 className="font-display text-4xl leading-[0.95] font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Dona directo,
            <br />
            bloque por bloque.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-soft">
            Block by Block conecta donantes con receptores verificados por IA.
            El dinero llega on-chain, sin intermediarios y sin comisión de
            plataforma.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="bg-emerald px-6 py-3 text-center font-medium text-paper-raised shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-dark hover:shadow-lg hover:shadow-emerald/30"
            >
              Registrarse
            </Link>
            <a
              href="#causas"
              className="border border-ink px-6 py-3 text-center font-medium text-ink transition-colors hover:bg-paper-raised"
            >
              Explorar causas
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
            <div>
              <dt className="text-sm text-ink-soft">Comisión</dt>
              <dd className="font-display text-3xl font-semibold text-ink">
                0%
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Red</dt>
              <dd className="font-display text-3xl font-semibold text-ink">
                HSK
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">Moneda</dt>
              <dd className="font-display text-3xl font-semibold text-ink">
                USDT
              </dd>
            </div>
          </dl>
        </div>

        <BlockStack />
      </div>
    </section>
  );
}
