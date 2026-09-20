import type { Lang } from "./index";

// Contenido largo (FAQ y términos) por idioma.
export const faqs: Record<Lang, { q: string; a: string }[]> = {
  es: [
    { q: "¿Qué es Block by Block?", a: "Una plataforma de donaciones directas entre personas: los donantes envían USDT on-chain a receptores cuyas causas fueron verificadas por un agente de IA, sin que ningún intermediario retenga el dinero." },
    { q: "¿Cómo se verifica que una causa es real?", a: "Cuando un receptor sube evidencia (foto y descripción), un agente de IA la evalúa y registra el resultado directamente en la cadena. Solo las causas marcadas como verificadas pueden recibir donaciones." },
    { q: "¿Cuánto cobra la plataforma?", a: "0%. El contrato transfiere el 100% de lo donado al receptor; Block by Block no retiene comisión." },
    { q: "¿En qué red corre esto y qué moneda se usa?", a: "HSK Chain testnet, usando una stablecoin USDT de 6 decimales. Es un entorno de pruebas: los fondos que se mueven no tienen valor monetario real." },
    { q: "¿Puedo recuperar una donación después de enviarla?", a: "No. Una donación es una transacción on-chain y, como toda transacción en blockchain, es irreversible una vez confirmada." },
    { q: "¿La plataforma guarda mi dinero o mis llaves?", a: "No. El backend nunca custodia fondos ni firma transacciones en tu nombre. Tú controlas tu wallet y firmas cada donación o retiro directamente." },
    { q: "¿Qué pasa si mi causa es rechazada por el agente de IA?", a: "La causa queda marcada como rechazada y no puede recibir donaciones. Por ahora la verificación es automática; una revisión humana adicional está en el roadmap." },
    { q: "¿Cómo retiro los fondos recaudados si soy receptor?", a: "Desde tu dashboard, para cualquier causa que esté verificada. El retiro es una transacción del contrato directo a tu wallet vinculada." },
  ],
  en: [
    { q: "What is Block by Block?", a: "A peer-to-peer direct donation platform: donors send USDT on-chain to recipients whose causes were verified by an AI agent, with no intermediary holding the money." },
    { q: "How is a cause verified as real?", a: "When a recipient uploads evidence (photo and description), an AI agent evaluates it and records the result directly on-chain. Only causes marked as verified can receive donations." },
    { q: "How much does the platform charge?", a: "0%. The contract transfers 100% of the donation to the recipient; Block by Block keeps no fee." },
    { q: "Which network does this run on and which currency is used?", a: "HSK Chain testnet, using a 6-decimal USDT stablecoin. It is a test environment: the funds moved have no real monetary value." },
    { q: "Can I get a donation back after sending it?", a: "No. A donation is an on-chain transaction and, like any blockchain transaction, it is irreversible once confirmed." },
    { q: "Does the platform hold my money or my keys?", a: "No. The backend never custodies funds nor signs transactions on your behalf. You control your wallet and sign each donation or withdrawal directly." },
    { q: "What happens if the AI agent rejects my cause?", a: "The cause is marked as rejected and cannot receive donations. For now verification is automatic; an additional human review is on the roadmap." },
    { q: "How do I withdraw the funds raised if I'm a recipient?", a: "From your dashboard, for any cause that is verified. The withdrawal is a contract transaction straight to your linked wallet." },
  ],
};

export const termsSections: Record<Lang, { title: string; body: string[] }[]> = {
  es: [
    { title: "1. Qué es Block by Block", body: ["Block by Block es un proyecto construido durante el Ethereum Builders Tour Cali (19–20 de septiembre de 2026) que conecta donantes con receptores a través de un contrato inteligente en HSK Chain testnet, usando una causa verificada por un agente de IA como condición para recibir fondos."] },
    { title: "2. Naturaleza de proyecto de hackathon", body: ["Este es un MVP construido con fines de demostración técnica, desplegado en una red de pruebas (testnet). Los tokens que se transfieren dentro de la plataforma no representan dinero real ni tienen valor de cambio fuera de ese entorno.", "Block by Block no es una entidad financiera regulada, no es una organización de caridad registrada, y no ofrece garantías de disponibilidad, continuidad ni soporte más allá del periodo del hackathon."] },
    { title: "3. Cuentas y verificación", body: ["Para donar o publicar una causa necesitas una cuenta y una wallet vinculada que controles directamente. Eres responsable de mantener el control de tu wallet y de las credenciales de tu cuenta."] },
    { title: "4. Sin custodia de fondos", body: ["El backend de Block by Block nunca custodia fondos ni firma transacciones en nombre de donantes o receptores. Cada donación, retiro o vinculación de wallet se firma directamente desde tu propia wallet."] },
    { title: "5. Verificación de causas por IA", body: ["Las causas se evalúan mediante un modelo de lenguaje con visión, sobre la evidencia que aporta el receptor. Esta verificación es automática y probabilística: reduce el riesgo de fraude, pero no lo elimina ni constituye una garantía de veracidad.", "Solo las causas marcadas como verificadas por el agente pueden recibir donaciones o permitir retiros."] },
    { title: "6. Donaciones", body: ["Las donaciones se ejecutan como transacciones on-chain y son irreversibles una vez confirmadas. Block by Block no cobra comisión de plataforma: el 100% de lo donado llega a la causa."] },
    { title: "7. Retiro de fondos", body: ["Un receptor puede retirar los fondos recaudados por una causa verificada directamente a su wallet vinculada, a través del contrato."] },
    { title: "8. Uso prohibido", body: ["No está permitido publicar causas falsas o engañosas, suplantar la identidad de otra persona u organización, ni usar la plataforma para actividades ilícitas. Las cuentas asociadas a este comportamiento pueden ser suspendidas."] },
    { title: "9. Limitación de responsabilidad", body: ["La plataforma se ofrece \"tal cual\", sin garantías de ningún tipo. En la medida permitida por la ley, el equipo de Block by Block no es responsable por pérdidas derivadas del uso de contratos inteligentes, errores de red, o de decisiones de donación basadas en la información mostrada en la plataforma."] },
    { title: "10. Cambios a estos términos", body: ["Estos términos pueden actualizarse a medida que el proyecto evoluciona más allá del hackathon. Los cambios relevantes se reflejarán en esta misma página."] },
  ],
  en: [
    { title: "1. What Block by Block is", body: ["Block by Block is a project built during the Ethereum Builders Tour Cali (September 19–20, 2026) that connects donors with recipients through a smart contract on HSK Chain testnet, using a cause verified by an AI agent as the condition to receive funds."] },
    { title: "2. Hackathon project nature", body: ["This is an MVP built for technical demonstration purposes, deployed on a test network (testnet). Tokens transferred within the platform do not represent real money nor have exchange value outside that environment.", "Block by Block is not a regulated financial entity, is not a registered charity, and offers no guarantees of availability, continuity or support beyond the hackathon period."] },
    { title: "3. Accounts and verification", body: ["To donate or publish a cause you need an account and a linked wallet that you control directly. You are responsible for keeping control of your wallet and your account credentials."] },
    { title: "4. No custody of funds", body: ["The Block by Block backend never custodies funds nor signs transactions on behalf of donors or recipients. Every donation, withdrawal or wallet link is signed directly from your own wallet."] },
    { title: "5. AI verification of causes", body: ["Causes are evaluated by a vision language model over the evidence the recipient provides. This verification is automatic and probabilistic: it reduces the risk of fraud but does not eliminate it nor guarantee truthfulness.", "Only causes marked as verified by the agent can receive donations or allow withdrawals."] },
    { title: "6. Donations", body: ["Donations are executed as on-chain transactions and are irreversible once confirmed. Block by Block charges no platform fee: 100% of the donation reaches the cause."] },
    { title: "7. Withdrawing funds", body: ["A recipient can withdraw the funds raised by a verified cause directly to their linked wallet, through the contract."] },
    { title: "8. Prohibited use", body: ["Publishing false or misleading causes, impersonating another person or organization, or using the platform for illegal activities is not allowed. Accounts associated with this behavior may be suspended."] },
    { title: "9. Limitation of liability", body: ["The platform is provided \"as is\", without warranties of any kind. To the extent permitted by law, the Block by Block team is not liable for losses arising from the use of smart contracts, network errors, or donation decisions based on the information shown on the platform."] },
    { title: "10. Changes to these terms", body: ["These terms may be updated as the project evolves beyond the hackathon. Relevant changes will be reflected on this same page."] },
  ],
};
