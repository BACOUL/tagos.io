import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Checkout désactivé pour l’instant." },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Checkout désactivé pour l’instant." },
    { status: 501 }
  );
}
