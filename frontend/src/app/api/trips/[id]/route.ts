import { NextResponse } from "next/server";
import { getTrip } from "@/lib/server/trip-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(getTrip((await params).id));
  } catch {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
}
