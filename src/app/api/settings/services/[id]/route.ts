import { NextResponse } from "next/server";
import { updateService, deleteService } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  updateService(Number(id), {
    ...(body.name !== undefined && { name: body.name.trim() }),
    ...(body.description !== undefined && { description: body.description?.trim() ?? null }),
    ...(body.price !== undefined && { price: body.price?.trim() ?? null }),
    ...(body.duration_minutes !== undefined && { duration_minutes: Number(body.duration_minutes) }),
    ...(body.active !== undefined && { active: Number(body.active) }),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteService(Number(id));
  return NextResponse.json({ ok: true });
}
