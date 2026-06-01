import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get("authorization") || "";

    const res = await fetch(`${API_BASE_URL}/api/shop/fingerprint`, {
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
    console.error("fingerprint API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
