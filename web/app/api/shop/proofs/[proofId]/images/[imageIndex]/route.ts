import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

type RouteContext = { params: Promise<{ proofId: string; imageIndex: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { proofId, imageIndex } = await params;
    const token = request.headers.get("authorization") || "";
    const res = await fetch(`${API_BASE_URL}/api/shop/proofs/${encodeURIComponent(proofId)}/images/${encodeURIComponent(imageIndex)}`, {
      method: "DELETE",
      headers: token ? { Authorization: token } : {},
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proof image delete proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
