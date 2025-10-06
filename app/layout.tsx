import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Tagos.io — Balises ALT & tags SEO pour vos images",
  description: "Générez automatiquement des textes ALT clairs et des tags SEO pour vos images. Simple, rapide, compatible WordPress/Shopify/Webflow.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Tagos.io",
    description: "ALT & tags SEO automatiques pour vos images",
    url: "https://tagos.io",
    siteName: "Tagos.io",
    type: "website"
  },
  metadataBase: new URL("https://tagos.io"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.className}>
      <body className="bg-gradient-to-b from-slate-50 to-white text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
