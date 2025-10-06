import { NextRequest, NextResponse } from "next/server";

function bad(msg: string, code=400) { return NextResponse.json({ error: msg }, { status: code }); }

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, lang = "fr", style = "neutral" } = await req.json();
    if (!imageBase64) return bad("imageBase64 manquant");
    if (imageBase64.length > 7_000_000) return bad("Image trop lourde (> ~5 Mo)");

    // MODE MOCK (aucune clé) → permet de tester sans payer
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        alt_text: lang === "fr" ? "Image (exemple) : produit sur fond blanc" : "Sample image: product on white background",
        tags: style === "ecommerce" ? ["produit","couleur","matière","marque","catégorie"] : ["image","scène","objet","contexte","exemple"]
      });
    }

    const styleHint =
      style === "ecommerce" ? "Ton concis orienté produit, inclure matière/couleur/caractéristiques."
      : style === "editorial" ? "Ton descriptif naturel, un peu de contexte visuel."
      : "Ton neutre, informatif et bref.";

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system",
            content: `Tu génères des ALT optimisés SEO en ${lang}. ${styleHint}
Retourne STRICTEMENT un JSON: {"alt_text":"...", "tags":["...","...","..."]} (max 5 tags).`},
          { role: "user",
            content: [
              { type: "input_text", text: "Décris l'image en une phrase concise utile au SEO et propose des tags." },
              { type: "input_image", image_url: `data:image/*;base64,${imageBase64}` },
            ]},
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return bad(`OpenAI error: ${t}`, 500);
    }

    const data = await resp.json();
    const raw = (data.output_text ?? data.content?.[0]?.text ?? "").trim();

    let parsed: { alt_text: string; tags: string[] } | null = null;
    try { parsed = JSON.parse(raw); } catch {}

    if (!parsed || !parsed.alt_text) parsed = { alt_text: raw || "Image", tags: [] };
    parsed.alt_text = String(parsed.alt_text).slice(0, 140);
    parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0,5).map(String) : [];

    return NextResponse.json(parsed);
  } catch (e: any) {
    return bad(e?.message || "Erreur serveur", 500);
  }
          }
