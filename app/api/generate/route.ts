// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";       // nécessaire pour Buffer / FormData en Node
export const dynamic = "force-dynamic";

function ok(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function bad(message: string, code = 400) {
  return ok({ error: message }, code);
}

// --- Contraintes ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo strictes
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// --- Utilitaires ---
function base64ByteLength(b64: string): number {
  // enlève éventuel header data URL
  const s = b64.includes(",") ? b64.split(",").slice(-1)[0] : b64;
  const len = s.length;
  const padding = (s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0);
  // 3/4 * len - padding
  return Math.floor((len * 3) / 4) - padding;
}
function stripDataUrl(b64: string): string {
  return b64.includes(",") ? b64.split(",").slice(-1)[0] : b64;
}
async function fileToBase64(file: File): Promise<{ b64: string; mime: string; name: string; size: number }> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  const name = file.name || "image";
  return { b64: buf.toString("base64"), mime, name, size: buf.byteLength };
}

const DEMO_TAGS = ["démo", "SEO", "optimisation", "IA", "Tagos"];
const DEMO_ALT = (name: string) => `Image de démonstration : ${name || "photo"}`;
function demo(filename?: string) {
  return ok({ alt_text: DEMO_ALT(filename || ""), tags: DEMO_TAGS });
}

// stopwords légers FR/EN
const STOPWORDS = new Set([
  "le","la","les","un","une","des","de","du","au","aux","et","ou","à","en","sur","dans","pour","par","avec","sans",
  "ce","cet","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses","nos","vos","leurs",
  "the","a","an","of","to","in","on","for","by","with","and","or","at","from","as"
]);
function tokenize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}
function guessKeywordsFromFilename(base: string, max = 5): string[] {
  const out: string[] = [];
  for (const t of tokenize(base)) {
    if (t.length < 3 || STOPWORDS.has(t)) continue;
    if (!out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out.length ? out : ["produit","photo","web"];
}
function generateAlt(keys: string[]) {
  const main = keys.slice(0, Math.min(6, Math.max(3, keys.length))).join(" ");
  return (main || "Image de produit sur fond clair").replace(/^./, c => c.toUpperCase());
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";

    let filename = "image.jpg";
    let lang = "fr";
    let style: "neutral" | "ecommerce" | "editorial" = "neutral";
    let mimeDetected: string | null = null;
    let payloadB64 = "";

    // 1) Entrées: JSON {imageBase64, lang, style} OU form-data {file, lang, style}
    if (ct.includes("application/json")) {
      const j = await req.json();
      if (typeof j.lang === "string") lang = j.lang;
      if (typeof j.style === "string") style = j.style;
      const raw = typeof j.imageBase64 === "string" ? j.imageBase64 : "";
      if (!raw) return bad("imageBase64 manquant.");
      const headerMatch = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      mimeDetected = headerMatch?.[1] ?? null;
      payloadB64 = stripDataUrl(raw);
      // validation taille réelle base64
      const bytes = base64ByteLength(payloadB64);
      if (bytes > MAX_FILE_SIZE) return bad("Image trop lourde (> 5 Mo).", 413);
      // si MIME absent dans data URL, on suppose JPEG
      if (!mimeDetected) mimeDetected = "image/jpeg";
      if (!ALLOWED_MIME.has(mimeDetected)) {
        return bad("Format non supporté. Utilisez JPG, PNG ou WEBP.", 415);
      }
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (!(f instanceof File)) return bad("file manquant.");
      if (!ALLOWED_MIME.has(f.type)) return bad("Format non supporté. Utilisez JPG, PNG ou WEBP.", 415);
      if (f.size > MAX_FILE_SIZE) return bad("Fichier trop volumineux (max 5 Mo).", 413);
      const { b64, mime, name, size } = await fileToBase64(f);
      payloadB64 = b64;
      mimeDetected = mime;
      filename = name || filename;
      // champs optionnels
      const L = form.get("lang");  if (typeof L === "string") lang = L;
      const S = form.get("style"); if (typeof S === "string") style = S as any;
      if (size > MAX_FILE_SIZE) return bad("Fichier trop volumineux (max 5 Mo).", 413);
    } else {
      return bad("Content-Type non supporté (JSON ou multipart/form-data).");
    }

    // 2) Si pas de clé → mode démo (ne plante pas l’UX)
    if (!process.env.OPENAI_API_KEY) {
      // petite heuristique à partir du nom pour une démo plus pertinente
      const base = filename.replace(/\.[^.]+$/, "");
      const tags = guessKeywordsFromFilename(base, 5);
      return ok({ alt_text: generateAlt(tags), tags });
    }

    // 3) Appel modèle vision
    const styleHint =
      style === "ecommerce"
        ? "Ton concis orienté produit, inclure matière/couleur/caractéristiques."
        : style === "editorial"
        ? "Ton descriptif naturel, ajouter un peu de contexte visuel."
        : "Ton neutre, informatif et bref.";

    const body = {
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: `Tu génères des ALT optimisés SEO en ${lang}. ${styleHint}
Retourne STRICTEMENT un JSON: {"alt_text":"...", "tags":["...","...","..."]} (max 5 tags).`,
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Décris l'image en une phrase concise utile au SEO et propose des tags." },
            { type: "input_image", image_url: `data:${mimeDetected};base64,${payloadB64}` },
          ],
        },
      ],
    };

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // quota dépassé → démo plutôt que 500
    if (resp.status === 429) return demo(filename);
    if (!resp.ok) {
      const t = await resp.text();
      return bad(`OpenAI error: ${t}`, 502);
    }

    const data = await resp.json();
    const raw = (data.output_text ?? data.content?.[0]?.text ?? "").trim();

    // 4) Parse robuste
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { alt_text: raw, tags: [] };
    }
    if (!parsed || typeof parsed !== "object") parsed = { alt_text: DEMO_ALT(filename), tags: [] };
    if (typeof parsed.alt_text !== "string") parsed.alt_text = DEMO_ALT(filename);
    if (!Array.isArray(parsed.tags)) parsed.tags = [];

    parsed.alt_text = String(parsed.alt_text).slice(0, 140);
    parsed.tags = parsed.tags.slice(0, 5).map((x: any) => String(x));

    return ok(parsed);
  } catch (e: any) {
    console.error("API /api/generate error:", e);
    return bad(e?.message || "Erreur serveur", 500);
  }
  }
