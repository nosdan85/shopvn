import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

type RouteContext = { params: Promise<{ proofId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { proofId } = await params;
    const token = request.headers.get("authorization") || "";
    const formData = await request.formData();
    const res = await fetch(`${API_BASE_URL}/api/shop/proofs/${encodeURIComponent(proofId)}/images`, {
      method: "POST",
      headers: token ? { Authorization: token } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proof image upload proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
