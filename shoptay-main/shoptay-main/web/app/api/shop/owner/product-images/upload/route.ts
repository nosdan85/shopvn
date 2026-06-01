import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const formData = await request.formData();
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/product-images/upload`, {
      method: "POST",
      headers: token ? { Authorization: token } : undefined,
      body: formData,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Upload product image API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
