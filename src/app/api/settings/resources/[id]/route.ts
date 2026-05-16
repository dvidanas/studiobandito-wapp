import { NextResponse } from "next/server";
import { updateResource, deleteResource, getAvailabilityForResource, setAvailabilityForResource } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slots = getAvailabilityForResource(Number(id));
  return NextResponse.json(slots);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (body.name !== undefined || body.active !== undefined) {
    updateResource(Number(id), {
      name: body.name?.trim(),
      active: body.active !== undefined ? Number(body.active) : undefined,
    });
  }
  if (Array.isArray(body.availability)) {
    setAvailabilityForResource(Number(id), body.availability);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteResource(Number(id));
  return NextResponse.json({ ok: true });
}
