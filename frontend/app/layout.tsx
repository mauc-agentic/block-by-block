import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PendingDonationsNotice } from "@/components/PendingDonationsNotice";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: "variable",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const description =
  "Donaciones directas on-chain: donantes y receptores verificados por IA, sin intermediarios y sin comisión.";

export const metadata: Metadata = {
  // TODO: set metadataBase al dominio real una vez desplegado, para que
  // og:image se resuelva como URL absoluta ante crawlers de redes sociales.
  title: "Block by Block",
  description,
  openGraph: {
    title: "Block by Block",
    description,
    type: "website",
    locale: "es_CO",
  },
  twitter: {
    card: "summary_large_image",
    title: "Block by Block",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-canvas text-fg">
        <Header />
        <div className="mx-auto w-full max-w-6xl px-4 empty:hidden sm:px-6">
          <PendingDonationsNotice />
        </div>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
