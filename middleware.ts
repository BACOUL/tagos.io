import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // IP client via en-têtes (pas de req.ip dans NextRequest)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  // En-têtes de sécurité de base
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Exemple CSP très permissif côté style à cause de Tailwind inline; ajuste plus tard si besoin
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' blob: data:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "font-src 'self' data:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' mailto:",
    ].join("; ")
  );

  // On expose l’IP côté réponse (utile pour logs côté edge/CDN)
  res.headers.set("x-client-ip", ip);

  return res;
}

// On évite les fichiers statiques et images Next dans le middleware
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
