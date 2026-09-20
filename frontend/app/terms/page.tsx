import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones — Block by Block",
  description:
    "Condiciones de uso de Block by Block: naturaleza de MVP de hackathon, custodia de fondos, verificación por IA y responsabilidad.",
};

const sections = [
  {
    title: "1. Qué es Block by Block",
    body: [
      "Block by Block es un proyecto construido durante el Ethereum Builders Tour Cali (19–20 de septiembre de 2026) que conecta donantes con receptores a través de un contrato inteligente en HSK Chain testnet, usando una causa verificada por un agente de IA como condición para recibir fondos.",
    ],
  },
  {
    title: "2. Naturaleza de proyecto de hackathon",
    body: [
      "Este es un MVP construido con fines de demostración técnica, desplegado en una red de pruebas (testnet). Los tokens que se transfieren dentro de la plataforma no representan dinero real ni tienen valor de cambio fuera de ese entorno.",
      "Block by Block no es una entidad financiera regulada, no es una organización de caridad registrada, y no ofrece garantías de disponibilidad, continuidad ni soporte más allá del periodo del hackathon.",
    ],
  },
  {
    title: "3. Cuentas y verificación",
    body: [
      "Para donar o publicar una causa necesitas una cuenta y una wallet vinculada que controles directamente. Eres responsable de mantener el control de tu wallet y de las credenciales de tu cuenta.",
    ],
  },
  {
    title: "4. Sin custodia de fondos",
    body: [
      "El backend de Block by Block nunca custodia fondos ni firma transacciones en nombre de donantes o receptores. Cada donación, retiro o vinculación de wallet se firma directamente desde tu propia wallet.",
    ],
  },
  {
    title: "5. Verificación de causas por IA",
    body: [
      "Las causas se evalúan mediante un modelo de lenguaje con visión, sobre la evidencia que aporta el receptor. Esta verificación es automática y probabilística: reduce el riesgo de fraude, pero no lo elimina ni constituye una garantía de veracidad.",
      "Solo las causas marcadas como verificadas por el agente pueden recibir donaciones o permitir retiros.",
    ],
  },
  {
    title: "6. Donaciones",
    body: [
      "Las donaciones se ejecutan como transacciones on-chain y son irreversibles una vez confirmadas. Block by Block no cobra comisión de plataforma: el 100% de lo donado llega a la causa.",
    ],
  },
  {
    title: "7. Retiro de fondos",
    body: [
      "Un receptor puede retirar los fondos recaudados por una causa verificada directamente a su wallet vinculada, a través del contrato.",
    ],
  },
  {
    title: "8. Uso prohibido",
    body: [
      "No está permitido publicar causas falsas o engañosas, suplantar la identidad de otra persona u organización, ni usar la plataforma para actividades ilícitas. Las cuentas asociadas a este comportamiento pueden ser suspendidas.",
    ],
  },
  {
    title: "9. Limitación de responsabilidad",
    body: [
      "La plataforma se ofrece \"tal cual\", sin garantías de ningún tipo. En la medida permitida por la ley, el equipo de Block by Block no es responsable por pérdidas derivadas del uso de contratos inteligentes, errores de red, o de decisiones de donación basadas en la información mostrada en la plataforma.",
    ],
  },
  {
    title: "10. Cambios a estos términos",
    body: [
      "Estos términos pueden actualizarse a medida que el proyecto evoluciona más allá del hackathon. Los cambios relevantes se reflejarán en esta misma página.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Términos y condiciones
      </h1>
      <p className="mt-4 text-ink-soft">
        Última actualización: 19 de septiembre de 2026.
      </p>

      <div className="mt-12 space-y-10 border-t border-line pt-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-ink-soft">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
