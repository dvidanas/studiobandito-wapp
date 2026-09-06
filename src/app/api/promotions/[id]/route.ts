import { NextResponse } from "next/server";
import { updatePromotion, deletePromotion } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  updatePromotion(Number(id), {
    ...(body.title !== undefined && { title: body.title.trim() }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.discount !== undefined && { discount: body.discount }),
    ...(body.active !== undefined && { active: Number(body.active) }),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deletePromotion(Number(id));
  return NextResponse.json({ ok: true });
}
