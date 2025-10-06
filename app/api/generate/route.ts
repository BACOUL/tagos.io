import { NextRequest, NextResponse } from "next/server";

/** Réponse JSON uniforme */
function ok(data: any, init: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status: init,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
function bad(message: string, code = 400) {
  return ok({ error: message }, code);
}

/** Convertit un File (form-data) en base64 (sans prefixe data:) */
async function fileToBase64(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return buf.toString("base64");
}

/** Petites valeurs par défaut */
const DEMO_ALT = (name: string) =>
  `Image de démonstration : ${name || "photo"}`;
const DEMO_TAGS = ["démo", "SEO", "optimisation", "IA", "Tagos"];

/** Fallback démo (sans clé / quota épuisé) */
function demoResponse(filename?: string) {
  return ok({ alt_text: DEMO_ALT(filename || ""), tags: DEMO_TAGS });
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let imageBase64 = "";
    let filename = "image.jpg";
    let lang = "fr";
    let style: "neutral" | "ecommerce" | "editorial" = "neutral";

    // ---- 1) Récupération des données d'entrée (JSON OU form-data)
    if (ct.includes("application/json")) {
      const { imageBase64: b64, lang: L, style: S } = await req.json();
      if (typeof b64 === "string") imageBase64 = b64;
      if (typeof L === "string") lang = L;
      if (typeof S === "string") style = S as any;
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      const L = form.get("lang");
      const S = form.get("style");
      if (f instanceof File) {
        imageBase64 = await fileToBase64(f);
        filename = f.name || filename;
      }
      if (typeof L === "string") lang = L;
      if (typeof S === "string") style = S as any;
    } else {
      return bad("Content-Type non supporté. Envoyez JSON (imageBase64) ou form-data (file).");
    }

    // garde-fous
    if (!imageBase64) return bad("imageBase64 (ou file) manquant.");
    if (imageBase64.length > 7_000_000) return bad("Image trop lourde (> ~5 Mo).");

    // ---- 2) Si pas de clé -> mode démo immédiat
    if (!process.env.OPENAI_API_KEY) {
      return demoResponse(filename);
    }

    // ---- 3) Prépare le prompt
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
            { type: "input_image", image_url: `data:image/*;base64,${imageBase64}` },
          ],
        },
      ],
    };

    // ---- 4) Appel OpenAI
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Si quota insuffisant -> démo propre au lieu de planter
    if (resp.status === 429) {
      return demoResponse(filename);
    }

    if (!resp.ok) {
      const t = await resp.text();
      return bad(`OpenAI error: ${t}`, 500);
    }

    const data = await resp.json();
    const raw = (data.output_text ?? data.content?.[0]?.text ?? "").trim();

    // ---- 5) Parse la sortie (toujours renvoyer un JSON)
    let parsed: { alt_text: string; tags: string[] } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback si le modèle répond en texte
      parsed = { alt_text: raw || DEMO_ALT(filename), tags: DEMO_TAGS };
    }

    // nettoyage
    parsed.alt_text = String(parsed.alt_text || DEMO_ALT(filename)).slice(0, 140);
    parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map(String) : DEMO_TAGS;

    return ok(parsed);
  } catch (e: any) {
    return bad(e?.message || "Erreur serveur", 500);
  }
        }
