import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const res = await fetch(`${API_BASE_URL}/api/admin/analytics/sales`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Analytics sales API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
