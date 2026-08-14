import { NextResponse, type NextRequest } from "next/server";
import { getClientById, getClientHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const id = parseInt(clientId, 10);
  if (isNaN(id)) return new NextResponse("bad id", { status: 400 });

  const client = getClientById(id);
  if (!client) return new NextResponse("not found", { status: 404 });

  const appointments = getClientHistory(id);
  return NextResponse.json({ client, appointments });
}
