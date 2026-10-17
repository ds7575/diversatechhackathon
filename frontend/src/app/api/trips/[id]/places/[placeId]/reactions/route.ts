import { NextResponse } from "next/server";
import { reactToPlace } from "@/lib/server/trip-store";
import type { ReactionKind } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; placeId: string }> }) {
  try {
    const { id, placeId } = await params;
    const body = await request.json();
    return NextResponse.json(reactToPlace(id, placeId, body?.kind as ReactionKind));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save reaction";
    const status = message === "Trip not found" ? 404 : message === "Place not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
