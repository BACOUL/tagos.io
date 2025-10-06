import type { Metadata } from "next";
import "./globals.css";
import { Inter, Poppins } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["600","800"], display: "swap", variable: "--font-pop" });

export const metadata: Metadata = {
  title: "Tagos.io — ALT & tags SEO pour vos images",
  description:
    "Générez automatiquement des textes ALT clairs et des tags SEO pour vos images. Simple, rapide, compatible WordPress/Shopify/Webflow.",
  metadataBase: new URL("https://tagos.io"),
  icons: { icon: "/favicon.svg" },
  robots: { index: true, follow: true },
  keywords: ["alt image", "seo image", "balise alt", "tags seo", "référencement images", "WordPress", "Shopify"],
  openGraph: {
    title: "Tagos.io — La visibilité, automatisée.",
    description: "ALT & mots-clés générés par IA — sans plugin.",
    url: "https://tagos.io",
    siteName: "Tagos.io",
    type: "website",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tagos.io",
    applicationCategory: "SEO",
    operatingSystem: "Web",
    description: "ALT & tags SEO pour images générés par IA",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }
  };

  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-white text-slate-900 antialiased">
        {/* JSON-LD SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
        {children}

        {/* Analytics RGPD (Plausible) — change data-domain si besoin */}
        <script defer data-domain="tagos.io" src="https://plausible.io/js/script.js" />
      </body>
    </html>
  );
}
