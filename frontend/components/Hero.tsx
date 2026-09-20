import Link from "next/link";

const columns = [
  { blocks: 3, color: "bg-blueprint" },
  { blocks: 6, color: "bg-brick" },
  { blocks: 4, color: "bg-moss" },
  { blocks: 7, color: "bg-blueprint" },
  { blocks: 5, color: "bg-brick" },
];

function BlockStack() {
  return (
    <div
      className="flex h-64 items-end justify-center gap-2 sm:h-80 lg:h-96"
      aria-hidden="true"
    >
      {columns.map((column, i) => (
        <div key={i} className="flex w-10 flex-col-reverse gap-1 sm:w-12">
          {Array.from({ length: column.blocks }, (_, j) => (
            <div key={j} className={`aspect-square w-full ${column.color}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-28">
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
            className="bg-blueprint px-6 py-3 text-center font-medium text-paper transition-colors hover:bg-blueprint-dark"
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
    </section>
  );
}
