import { NextResponse } from "next/server";
import { listPromotions, createPromotion } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPromotions(true));
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const id = createPromotion({
    title: body.title.trim(),
    description: body.description ?? null,
    discount: body.discount ?? null,
  });
  return NextResponse.json({ id });
}
