// lib/generate.ts
import { slugify } from "./slugify";

const STOPWORDS = new Set([
  // FR
  "le","la","les","un","une","des","de","du","au","aux","et","ou","à","en","sur","dans","pour","par","avec","sans",
  "ce","cet","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses","nos","vos","leurs",
  // EN
  "the","a","an","of","to","in","on","for","by","with","and","or","at","from","as"
]);

function tokenizeBase(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

export function guessKeywordsFromFilename(filenameNoExt: string, max = 8): string[] {
  const tokens = tokenizeBase(filenameNoExt).filter(t => !STOPWORDS.has(t) && t.length >= 3);
  const unique: string[] = [];
  for (const t of tokens) if (!unique.includes(t)) unique.push(t);
  return unique.slice(0, max);
}

export function generateAlt(keywords: string[]): string {
  if (!keywords.length) return "Image téléchargée (photo).";
  // Petite phrase simple basée sur 3–6 mots
  const main = keywords.slice(0, Math.min(6, Math.max(3, keywords.length))).join(" ");
  return main.charAt(0).toUpperCase() + main.slice(1);
}

export function generateTitle(keywords: string[]): string {
  if (!keywords.length) return "Image optimisée";
  const main = keywords.slice(0, 5).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  return main;
}

export function generateCaption(keywords: string[]): string {
  if (!keywords.length) return "L’image optimisée pour le référencement.";
  return `Image optimisée SEO : ${keywords.slice(0, 5).join(", ")}.`;
}

export function makeFilenameFromKeywords(keywords: string[], ext: string): string {
  const base = keywords.length ? keywords.join(" ") : "image-optimisee";
  return `${slugify(base)}${ext}`;
}

export function buildJSONLD(params: {
  alt: string;
  title: string;
  keywords: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: params.title,
    description: params.alt,
    keywords: params.keywords.join(", "),
  };
}

export function buildSitemapImageSnippet(params: {
  filename: string; // ex: chaussure-nike.jpg
  title: string;
  caption: string;
  publicBaseUrl?: string; // optionnel, si tu as l'URL publique
}) {
  const base = params.publicBaseUrl ?? "https://YOUR-SITE/IMG_PATH";
  const url = `${base}/${params.filename}`;
  return [
    `<image:image>`,
    `  <image:loc>${url}</image:loc>`,
    `  <image:title>${escapeXml(params.title)}</image:title>`,
    `  <image:caption>${escapeXml(params.caption)}</image:caption>`,
    `</image:image>`
  ].join("\n");
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, c => (
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" :
    c === "'" ? "&apos;" : "&quot;"
  ));
    }
