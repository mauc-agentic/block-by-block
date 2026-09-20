import { Hero } from "@/components/Hero";
import { CausesSection } from "@/components/CausesSection";
import { HowItWorks } from "@/components/HowItWorks";

// UC-007: la sección de causas lee GET /causes en cada visita; sin esto,
// Next.js la congelaría en la respuesta obtenida en build time.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <CausesSection />
      <HowItWorks />
    </>
  );
}
