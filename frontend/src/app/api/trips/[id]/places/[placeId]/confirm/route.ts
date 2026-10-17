import { NextResponse } from "next/server";
import { confirmPlace } from "@/lib/server/trip-store";

export async function POST(_: Request, { params }: { params: Promise<{ id: string; placeId: string }> }) {
  try {
    const { id, placeId } = await params;
    return NextResponse.json(confirmPlace(id, placeId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm place";
    return NextResponse.json({ error: message }, { status: message === "Trip not found" ? 404 : 400 });
  }
}
