import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Rate-limit minimal : 30 requêtes / minute / IP sur /api/*
 * NB: Sur Vercel, le middleware est sans état entre invocations.
 * Ce garde-fou suffit pour éviter les floods involontaires.
 * (Pour du cost control avancé, on passera plus tard à un store KV.)
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQ = 30;

// En dev/SSR local, cette Map vivra en mémoire de process.
// En production serverless, elle peut ne pas persister entre requêtes.
const hits = new Map<string, { count: number; ts: number }>();

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ne cible que l’API
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Récupération IP (ordre: req.ip -> x-forwarded-for -> fallback)
  const ip =
    req.ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const now = Date.now();
  const rec = hits.get(ip);

  if (!rec || now - rec.ts > WINDOW_MS) {
    hits.set(ip, { count: 1, ts: now });
    return NextResponse.next();
  }

  if (rec.count >= MAX_REQ) {
    return new NextResponse(
      JSON.stringify({ error: "Trop de requêtes, réessayez d’ici une minute." }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  rec.count += 1;
  return NextResponse.next();
}

export const config = {
  // On applique le middleware uniquement à /api/*
  matcher: "/api/:path*",
};
