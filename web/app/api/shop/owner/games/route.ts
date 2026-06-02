import { NextRequest, NextResponse } from "next/server";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/games`, {
      method: "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      cache: "no-store",
    });
    const data = await res.json();
    // Support both { games: [] } and flat [] responses
    const games = data.games || (Array.isArray(data) ? data : []);
    return NextResponse.json(Array.isArray(games) ? games : [], { status: res.status });
  } catch (error) {
    console.error("Owner games API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const body = await request.json();
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Create game API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
