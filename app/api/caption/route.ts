import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, lang = "fr", style = "neutral" } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 manquant" }, { status: 400 });
    }

    const styleHint =
      style === "ecommerce"
        ? "Ton concis orienté produit, mots-clés matière/couleur."
        : style === "editorial"
        ? "Ton descriptif naturel, contexte visuel."
        : "Ton neutre et informatif.";

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: `Tu es un assistant qui génère des descriptions d'images optimisées SEO en ${lang}.
            ${styleHint}
            Retourne STRICTEMENT un JSON: {"alt_text": "...", "tags": ["...","...","..."]} (5 tags max).`,
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Analyse et décris l'image pour un alt text concis et utile au SEO." },
              { type: "input_image", image_url: `data:image/*;base64,${imageBase64}` },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: "OpenAI error", details: t }, { status: 500 });
    }

    const data = await resp.json();
    const raw = (data.output_text ?? data.content?.[0]?.text ?? "").trim();

    let parsed = null as null | { alt_text: string; tags: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {}

    if (!parsed || !parsed.alt_text) {
      parsed = { alt_text: raw || "Image", tags: [] };
    } else {
      parsed.alt_text = String(parsed.alt_text).slice(0, 140);
      parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map(String) : [];
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
        }
