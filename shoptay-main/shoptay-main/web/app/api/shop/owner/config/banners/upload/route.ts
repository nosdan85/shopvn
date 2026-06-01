import { NextRequest, NextResponse } from "next/server";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization") || "";
  const formData = await request.formData();
  const res = await fetch(`${API_BASE_URL}/api/shop/owner/config/banners/upload`, { method: "POST", headers: token ? { Authorization: token } : undefined, body: formData });
  return NextResponse.json(await res.json(), { status: res.status });
}
