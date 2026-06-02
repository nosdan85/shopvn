import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "1";
    const limit = url.searchParams.get("limit") || "12";
    const res = await fetch(`${API_BASE_URL}/api/shop/proofs?page=${page}&limit=${limit}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store"
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proofs API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
