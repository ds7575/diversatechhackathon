import { NextResponse } from "next/server";
import { listTrips } from "@/lib/server/trip-store";

export function GET() {
  return NextResponse.json(listTrips());
}
