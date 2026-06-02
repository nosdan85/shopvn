import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[PROXY] Exchanging Discord code with backend:", `${API_BASE_URL}/api/shop/auth/discord`);
    const res = await fetch(`${API_BASE_URL}/api/shop/auth/discord`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[PROXY] Backend error details:", data);
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[PROXY] Discord exchange API exception:", error);
    return NextResponse.json(
      { error: "Internal server error at proxy layer" },
      { status: 500 }
    );
  }
}
