import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Preguntas frecuentes — Block by Block",
  description:
    "Respuestas sobre cómo funciona Block by Block: verificación por IA, comisiones, red, custodia y retiros.",
};

const faqs = [
  {
    question: "¿Qué es Block by Block?",
    answer:
      "Una plataforma de donaciones directas entre personas: los donantes envían USDT on-chain a receptores cuyas causas fueron verificadas por un agente de IA, sin que ningún intermediario retenga el dinero.",
  },
  {
    question: "¿Cómo se verifica que una causa es real?",
    answer:
      "Cuando un receptor sube evidencia (foto y descripción), un agente de IA la evalúa y registra el resultado directamente en la cadena. Solo las causas marcadas como verificadas pueden recibir donaciones.",
  },
  {
    question: "¿Cuánto cobra la plataforma?",
    answer:
      "0%. El contrato transfiere el 100% de lo donado al receptor; Block by Block no retiene comisión.",
  },
  {
    question: "¿En qué red corre esto y qué moneda se usa?",
    answer:
      "HSK Chain testnet, usando una stablecoin USDT de 6 decimales. Es un entorno de pruebas: los fondos que se mueven no tienen valor monetario real.",
  },
  {
    question: "¿Puedo recuperar una donación después de enviarla?",
    answer:
      "No. Una donación es una transacción on-chain y, como toda transacción en blockchain, es irreversible una vez confirmada.",
  },
  {
    question: "¿La plataforma guarda mi dinero o mis llaves?",
    answer:
      "No. El backend nunca custodia fondos ni firma transacciones en tu nombre. Tú controlas tu wallet y firmas cada donación o retiro directamente.",
  },
  {
    question: "¿Qué pasa si mi causa es rechazada por el agente de IA?",
    answer:
      "La causa queda marcada como rechazada y no puede recibir donaciones. Por ahora la verificación es automática; una revisión humana adicional está en el roadmap.",
  },
  {
    question: "¿Cómo retiro los fondos recaudados si soy receptor?",
    answer:
      "Desde tu dashboard de receptor, para cualquier causa que esté verificada. El retiro es una transacción del contrato directo a tu wallet vinculada.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Preguntas frecuentes
      </h1>
      <p className="mt-4 max-w-xl text-ink-soft">
        Si tu pregunta no está aquí, revisa los{" "}
        <Link
          href="/terms"
          className="text-blueprint hover:text-blueprint-dark"
        >
          términos y condiciones
        </Link>{" "}
        o contáctanos.
      </p>

      <dl className="mt-12 divide-y divide-line border-t border-line">
        {faqs.map((faq) => (
          <div key={faq.question} className="py-6">
            <dt className="font-display text-xl font-semibold text-ink">
              {faq.question}
            </dt>
            <dd className="mt-2 text-ink-soft">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
