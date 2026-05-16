import { NextResponse } from "next/server";
import { updateService, deleteService } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  updateService(Number(id), {
    name: body.name?.trim(),
    description: body.description?.trim() ?? null,
    price: body.price?.trim() ?? null,
    duration_minutes: body.duration_minutes ? Number(body.duration_minutes) : undefined,
    active: body.active !== undefined ? Number(body.active) : undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteService(Number(id));
  return NextResponse.json({ ok: true });
}
