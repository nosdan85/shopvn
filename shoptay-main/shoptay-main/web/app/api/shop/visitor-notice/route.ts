import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const res = await fetch(`${API_BASE_URL}/api/shop/visitor-notice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Visitor notice proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
