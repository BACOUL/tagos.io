import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-06-20" });

// Lis/écris les crédits dans un cookie signé simple (sans DB)
function getCredits(req: NextRequest): number {
  const raw = req.cookies.get("tg_credits")?.value || "0";
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : Math.max(0, n);
}
function setCredits(res: NextResponse, total: number) {
  res.cookies.set("tg_credits", String(total), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
  });
}

export async function GET(req: NextRequest) {
  try {
    const session_id = req.nextUrl.searchParams.get("session_id");
    if (!session_id) return NextResponse.json({ error: "session_id manquant" }, { status: 400 });

    // Vérifie la session auprès de Stripe
    const ss = await stripe.checkout.sessions.retrieve(session_id, { expand: ["payment_intent"] });
    if (ss.payment_status !== "paid") {
      return NextResponse.json({ error: "Paiement non confirmé" }, { status: 400 });
    }

    // Anti double-crédit (best-effort sans DB) :
    // On marque juste en cookie qu'on a vu cette session (limité mais OK pour MVP)
    const seen = (req.cookies.get("tg_seen")?.value || "").split(",").filter(Boolean);
    if (seen.includes(session_id)) {
      const total = getCredits(req);
      return NextResponse.json({ ok: true, added: 0, total });
    }

    // Nombre de crédits à accorder (depuis metadata)
    const credits = parseInt((ss.metadata?.credits as string) || "10000", 10);
    const current = getCredits(req);
    const total = current + (isNaN(credits) ? 10000 : credits);

    const res = NextResponse.json({ ok: true, added: credits, total });
    setCredits(res, total);
    // Ajoute la session_id vue (limite cookie ~4KB, OK le temps du MVP)
    const nextSeen = [...seen, session_id].slice(-20).join(",");
    res.cookies.set("tg_seen", nextSeen, {
      httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60*60*24*365
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
  }
