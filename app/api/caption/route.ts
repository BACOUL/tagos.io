import { NextRequest, NextResponse } from "next/server";

function ok(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
function bad(message: string, code = 400) {
  return ok({ error: message }, code);
}
async function fileToBase64(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return buf.toString("base64");
}

const DEMO_TAGS = ["démo", "SEO", "optimisation", "IA", "Tagos"];
const DEMO_ALT = (name: string) => `Image de démonstration : ${name || "photo"}`;
function demo(filename?: string) {
  return ok({ alt_text: DEMO_ALT(filename || ""), tags: DEMO_TAGS });
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let imageBase64 = "";
    let filename = "image.jpg";
    let lang = "fr";
    let style: "neutral" | "ecommerce" | "editorial" = "neutral";

    // Entrées: JSON {imageBase64, lang, style} OU form-data {file, lang, style}
    if (ct.includes("application/json")) {
      const j = await req.json();
      if (typeof j.imageBase64 === "string") imageBase64 = j.imageBase64;
      if (typeof j.lang === "string") lang = j.lang;
      if (typeof j.style === "string") style = j.style;
    } else if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (f instanceof File) {
        imageBase64 = await fileToBase64(f);
        filename = f.name || filename;
      }
      const L = form.get("lang");  if (typeof L === "string") lang = L;
      const S = form.get("style"); if (typeof S === "string") style = S as any;
    } else {
      return bad("Content-Type non supporté (JSON ou multipart/form-data).");
    }

    if (!imageBase64) return bad("imageBase64 (ou file) manquant.");
    if (imageBase64.length > 7_000_000) return bad("Image trop lourde (> ~5 Mo).");

    // Pas de clé -> mode démo
    if (!process.env.OPENAI_API_KEY) return demo(filename);

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

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) return demo(filename); // quota épuisé -> démo
    if (!resp.ok) {
      const t = await resp.text();
      return bad(`OpenAI error: ${t}`, 500);
    }

    const data = await resp.json();
    const raw = (data.output_text ?? data.content?.[0]?.text ?? "").trim();

    // Parse sécurisé (jamais null à la suite)
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
    return bad(e?.message || "Erreur serveur", 500);
  }
}
