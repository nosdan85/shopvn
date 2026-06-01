import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/lucky-wheel`, {
      method: "GET",
      headers: token ? { Authorization: token } : undefined,
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Owner lucky wheel API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const body = await request.json();
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/lucky-wheel`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Owner lucky wheel save API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
