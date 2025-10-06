import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.formData();
  const file = body.get("file") as File;
  const filename = file.name || "image.jpg";

  // --- MODE DÉMO --- (aucune clé OpenAI requise)
  const demoAlt = `Image de démonstration : ${filename}`;
  const demoTags = ["démo", "SEO", "optimisation", "IA", "Tagos"];

  return NextResponse.json({
    alt_text: demoAlt,
    tags: demoTags,
  });
}
