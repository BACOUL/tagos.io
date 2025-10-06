import { NextRequest, NextResponse } from "next/server";

function getCredits(req: NextRequest): number {
  const raw = req.cookies.get("tg_credits")?.value || "0";
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}
function setCredits(res: NextResponse, total: number) {
  res.cookies.set("tg_credits", String(total), {
    httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60*60*24*365
  });
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, lang = "fr", style = "neutral" } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 manquant" }, { status: 400 });
    }

    // 1) Vérifie et décrémente 1 crédit si disponible
    const credits = getCredits(req);
    const res = NextResponse.next(); // on crée la réponse en avance pour poser le cookie ensuite

    if (credits > 0) {
      setCredits(res, credits - 1);
    } else {
      // Pas de crédits — tu peux bloquer ici si tu veux forcer l'achat :
      // return NextResponse.json({ error: "Plus de crédits" }, { status: 402 });
      // Pour le MVP, on laisse passer (free), mais on n'écrit pas de cookie.
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
    try { parsed = JSON.parse(raw); } catch {}

    if (!parsed || !parsed.alt_text) {
      parsed = { alt_text: raw || "Image", tags: [] };
    } else {
      parsed.alt_text = String(parsed.alt_text).slice(0, 140);
      parsed.tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map(String) : [];
    }

    // renvoyer via "res" pour conserver le cookie mis à jour
    return new NextResponse(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      cookies: res.cookies, // préserve cookies modifiés
    } as any);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
  }
