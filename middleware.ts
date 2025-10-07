import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // IP via en-têtes (NextRequest n'a pas req.ip)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  // ⚠️ CSP assouplie pour Next.js (ok en prod simple, on resserrera plus tard)
  // En dev / premier déploiement, accepte inline & eval sinon l'app ne s'hydrate pas.
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self' blob: data:",
      "img-src 'self' blob: data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "connect-src 'self' blob: data:",
      "font-src 'self' data:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' mailto:",
    ].join("; ")
  );

  // En-têtes de sécurité raisonnables
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Utile pour logs/CDN
  res.headers.set("x-client-ip", ip);

  return res;
}

// Évite de passer sur les assets statiques
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
