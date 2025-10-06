import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-06-20" });

// Prix: pack 10 000 crédits = 10 € (tu peux remplacer par un prixId Stripe si tu préfères)
const UNIT_AMOUNT = 1000; // 10,00 € en centimes
const CREDITS_PER_PURCHASE = 10000;

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const successUrl = `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/?cancel=1`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: "Pack Tagos – 10 000 crédits" },
            unit_amount: UNIT_AMOUNT,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // astuce: on encode le nombre de crédits dans metadata
      metadata: { credits: String(CREDITS_PER_PURCHASE) },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe error" }, { status: 500 });
  }
}
