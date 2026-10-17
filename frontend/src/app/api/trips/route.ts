import { NextResponse } from "next/server";
import { createTrip, listTrips } from "@/lib/server/trip-store";

export function GET() {
  return NextResponse.json(listTrips());
}

export async function POST(request: Request) {
  try {
    return NextResponse.json(createTrip(await request.json()), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create trip";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
