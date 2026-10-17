import { NextResponse } from "next/server";
import { getItinerary } from "@/lib/server/trip-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(getItinerary((await params).id));
  } catch {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
}
