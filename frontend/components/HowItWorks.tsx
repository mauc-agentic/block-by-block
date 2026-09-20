const steps = [
  {
    title: "Crear causa",
    description:
      "El receptor describe su necesidad: título, descripción y monto objetivo.",
  },
  {
    title: "Verificación por IA",
    description:
      "Un agente evalúa la evidencia y registra el resultado en la cadena.",
  },
  {
    title: "Donar",
    description:
      "El donante envía USDT directo a la causa verificada, sin intermediarios.",
  },
  {
    title: "Retirar fondos",
    description: "El receptor retira lo recaudado cuando lo necesita.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-t border-line bg-paper-raised"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Cómo funciona
        </h2>

        <div className="mt-12">
          <div className="hidden sm:grid sm:grid-cols-4 sm:gap-6">
            {steps.map((_, i) => (
              <div key={i} className="flex items-center">
                <span className="h-3 w-3 shrink-0 bg-emerald" />
                {i < steps.length - 1 && (
                  <span className="ml-2 h-0.5 flex-1 bg-line" />
                )}
              </div>
            ))}
          </div>

          <ol className="grid gap-8 sm:mt-4 sm:grid-cols-4 sm:gap-6">
            {steps.map((step) => (
              <li key={step.title} className="flex gap-3 sm:block">
                <span className="mt-1.5 h-3 w-3 shrink-0 bg-emerald sm:hidden" />
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
