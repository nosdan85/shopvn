import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

type RouteContext = { params: Promise<{ discordId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { discordId } = await params;
    const token = request.headers.get("authorization") || "";
    const body = await request.json().catch(() => ({ count: 1 }));
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/linked-users/${encodeURIComponent(discordId)}/lucky-wheel-ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Owner lucky wheel ticket API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
