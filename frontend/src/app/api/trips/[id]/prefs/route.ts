import { NextResponse } from "next/server";
import { getTripPrefs, updateTripPrefs } from "@/lib/server/trip-store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(getTripPrefs((await params).id));
  } catch {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(updateTripPrefs((await params).id, await request.json()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save preferences";
    return NextResponse.json({ error: message }, { status: message === "Trip not found" ? 404 : 400 });
  }
}
