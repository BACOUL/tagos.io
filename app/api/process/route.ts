// app/api/process/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --- Contraintes --- */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/* --- Utilitaires locaux (autonomes) --- */
function ok(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
function bad(message: string, code = 400) {
  return ok({ error: message }, code);
}
function slugify(input: string): string {
  return input
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120);
}
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
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}
function guessKeywordsFromFilename(filenameNoExt: string, max = 8): string[] {
  const tokens = tokenizeBase(filenameNoExt).filter(t => !STOPWORDS.has(t) && t.length >= 3);
  const unique: string[] = [];
  for (const t of tokens) if (!unique.includes(t)) unique.push(t);
  return unique.slice(0, max);
}
function generateAlt(keywords: string[]): string {
  if (!keywords.length) return "Image optimisée pour le référencement.";
  const main = keywords.slice(0, Math.min(6, Math.max(3, keywords.length))).join(" ");
  return main.charAt(0).toUpperCase() + main.slice(1);
}
function generateTitle(keywords: string[]): string {
  if (!keywords.length) return "Image optimisée";
  return keywords.slice(0, 5).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}
function generateCaption(keywords: string[]): string {
  if (!keywords.length) return "Image optimisée pour le référencement.";
  return `Image optimisée SEO : ${keywords.slice(0, 5).join(", ")}.`;
}
function makeFilenameFromKeywords(keywords: string[], ext: string): string {
  const base = keywords.length ? keywords.join(" ") : "image-optimisee";
  return `${slugify(base)}${ext}`;
}
function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, c =>
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" :
    c === "'" ? "&apos;" : "&quot;"
  );
}
function buildJSONLD(params: { alt: string; title: string; keywords: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: params.title,
    description: params.alt,
    keywords: params.keywords.join(", "),
  };
}
function buildSitemapImageSnippet(params: {
  filename: string;
  title: string;
  caption: string;
  publicBaseUrl?: string; // à renseigner plus tard si tu veux générer une URL complète
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
function getExtFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png":  return ".png";
    case "image/webp": return ".webp";
    default:           return "";
  }
}

/* --- Handler --- */
export async function POST(req: NextRequest) {
  try {
    // 1) Lecture de la FormData (fichier) — pas de stockage, traitement en mémoire
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return bad("Aucun fichier fourni (clé 'file').");
    }
    const mime = file.type || "application/octet-stream";
    const size = file.size;

    if (!ALLOWED_MIME.has(mime)) {
      return bad("Format non supporté. Utilisez JPG, PNG ou WEBP.", 415);
    }
    if (size > MAX_FILE_SIZE) {
      return bad("Fichier trop volumineux (max 5 Mo).", 413);
    }

    // Lecture en mémoire (cohérent avec “fichiers non stockés”)
    await file.arrayBuffer();

    // 2) Heuristiques basées sur le nom de fichier
    const originalName = (file as any).name || "image";
    const baseNoExt = originalName.replace(/\.[^.]+$/, "");
    const ext = getExtFromMime(mime);

    const keywords = guessKeywordsFromFilename(baseNoExt, 8);     // (2) keywords 3–8
    const alt      = generateAlt(keywords);                       // (1) alt
    const title    = generateTitle(keywords);                     // (4) title
    const caption  = generateCaption(keywords);                   // (5) caption
    const filename = makeFilenameFromKeywords(keywords, ext);     // (3) filename slugifié

    // (6) structuredData + sitemapSnippet
    const structuredData = buildJSONLD({ alt, title, keywords });
    const sitemapSnippet = buildSitemapImageSnippet({ filename, title, caption });

    // 3) Réponse : les 6 livrables
    return ok({
      ok: true,
      mime,
      size,
      originalName,
      result: {
        alt,
        keywords,
        filename,
        title,
        caption,
        structuredData,
        sitemapSnippet,
      },
      // OPTION plus tard: renvoyer aussi le binaire renommé (Blob/stream) si tu veux un download direct
    });
  } catch (e: any) {
    console.error("API /api/process error:", e);
    return bad("Erreur interne.", 500);
  }
}
