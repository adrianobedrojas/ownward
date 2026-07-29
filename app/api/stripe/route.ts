import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Deprecated endpoint. Use /api/checkout." },
    { status: 410 }
  );
}