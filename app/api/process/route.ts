// app/api/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_MIME, MAX_FILE_SIZE } from "@/lib/limits";
import {
  generateAlt,
  generateCaption,
  generateTitle,
  guessKeywordsFromFilename,
  makeFilenameFromKeywords,
  buildJSONLD,
  buildSitemapImageSnippet,
} from "@/lib/generate";

export const runtime = "nodejs";       // requis pour accès FormData en Node
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1) Récupérer le fichier envoyé en FormData
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier fourni (clé 'file')." }, { status: 400 });
    }

    // 2) Validation basique du type & de la taille
    const mime = file.type;
    const size = file.size;
    if (!ALLOWED_MIME.includes(mime as any)) {
      return NextResponse.json(
        { error: `Type non supporté. Autorisés: ${ALLOWED_MIME.join(", ")}.` },
        { status: 415 }
      );
    }
    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (> ${Math.round(MAX_FILE_SIZE/1024/1024)} Mo).` },
        { status: 413 }
      );
    }

    // 3) Lire le binaire EN MÉMOIRE (pas de stockage)
    // (On n'utilise pas le contenu pour l'instant ; MVP "offline" sans IA externe)
    const arrayBuffer = await file.arrayBuffer();
    const _buffer = Buffer.from(arrayBuffer); // pas stocké, vie courte

    // 4) Heuristiques basées sur le nom de fichier
    const originalName = (file as any).name || "image";
    const ext = getExtFromMime(mime);
    const baseNoExt = originalName.replace(/\.[^.]+$/, "");

    const keywords = guessKeywordsFromFilename(baseNoExt, 8);
    const alt = generateAlt(keywords);
    const title = generateTitle(keywords);
    const caption = generateCaption(keywords);
    const filename = makeFilenameFromKeywords(keywords, ext);

    // 5) JSON-LD + Snippet sitemap image (URL publique à remplacer côté intégration)
    const structuredData = buildJSONLD({ alt, title, keywords });
    const sitemapSnippet = buildSitemapImageSnippet({
      filename,
      title,
      caption,
      // publicBaseUrl: "https://tagos.io/images" // à renseigner plus tard si tu veux
    });

    // 6) Réponse JSON : 6 livrables (+ meta)
    return NextResponse.json({
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
    }, {
      // Sécurité : on explicite qu'aucune mise en cache côté CDN
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      }
    });

  } catch (err: any) {
    console.error("API /api/process error:", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}

function getExtFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg": return ".jpg";
    case "image/png":  return ".png";
    case "image/webp": return ".webp";
    default:           return "";
  }
}
