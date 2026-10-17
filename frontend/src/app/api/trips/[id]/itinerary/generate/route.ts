import { NextResponse } from "next/server";
import { generateItinerary } from "@/lib/server/trip-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(generateItinerary(id, body?.confirm === true));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate recommendation";
    const status = message === "confirm_required" ? 409 : message === "Trip not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
