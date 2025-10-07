import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4F46E5",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://tagos.io"),
  title: {
    default: "Tagos.io — Rendez vos images visibles",
    template: "%s — Tagos.io",
  },
  description:
    "Tagos transforme vos images en contenu compréhensible par Google : ALT clair, mots-clés pertinents et nom de fichier optimisé — en quelques secondes.",
  applicationName: "Tagos.io",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    url: "https://tagos.io",
    title: "Tagos.io — Rendez vos images visibles",
    description:
      "ALT, mots-clés et renommage de fichier optimisés automatiquement. Essayez gratuitement (3 images/jour).",
    siteName: "Tagos.io",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "Tagos.io — Optimisation d’images automatique (ALT + tags + renommage)",
      },
    ],
    locale: "fr_FR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tagos.io — Rendez vos images visibles",
    description:
      "ALT clair, mots-clés pertinents et nom de fichier optimisé — en quelques secondes.",
    images: ["/og-cover.png"],
  },
  alternates: {
    canonical: "https://tagos.io/",
  },
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.className}>
      <body className="bg-white text-slate-900 antialiased">
        {/* JSON-LD SoftwareApplication (existant) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Tagos.io",
              applicationCategory: "SEO Tool",
              operatingSystem: "Web",
              url: "https://tagos.io",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "EUR",
              },
              description:
                "Optimisation d’images automatique : ALT, mots-clés et nom de fichier optimisés pour le SEO.",
            }),
          }}
        />

        {/* JSON-LD Product (packs) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: "Tagos.io",
              description:
                "Optimisation d’images automatique : ALT, mots-clés pertinents et renommage de fichier.",
              brand: { "@type": "Brand", name: "Tagos" },
              url: "https://tagos.io",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "EUR",
                  name: "Gratuit",
                  availability: "https://schema.org/InStock",
                },
                {
                  "@type": "Offer",
                  price: "7",
                  priceCurrency: "EUR",
                  name: "Starter (300 images)",
                  availability: "https://schema.org/PreOrder",
                },
                {
                  "@type": "Offer",
                  price: "19",
                  priceCurrency: "EUR",
                  name: "Pro (1500 images)",
                  availability: "https://schema.org/PreOrder",
                },
              ],
            }),
          }}
        />

        {/* JSON-LD FAQPage (FAQ de la home) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Stockez-vous mes images ?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Non. Les fichiers sont traités puis immédiatement supprimés.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Est-ce compatible avec mon CMS ?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Oui : WordPress, Shopify, Webflow… Copiez/collez, export CSV, ou fichier renommé.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Quelles sont les limites d’upload ?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Jusqu’à 5 Mo par image pour l’upload. Offres payantes : 300 à 1500 images par pack.",
                  },
                },
              ],
            }),
          }}
        />

        {children}
      </body>
    </html>
  );
              }
