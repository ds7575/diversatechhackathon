import { NextResponse } from "next/server";
import { importReel, listReels } from "@/lib/server/trip-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(listReels((await params).id));
  } catch {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const reel = await importReel((await params).id, body?.url);
    return NextResponse.json(reel, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import Reel";
    const status = message.includes("paid-call approval") ? 409 : message === "Trip not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
