import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get("authorization") || "";
    const res = await fetch(`${API_BASE_URL}/api/shop/referral/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: "Upstream returned non-JSON response", raw };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("referral apply API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
