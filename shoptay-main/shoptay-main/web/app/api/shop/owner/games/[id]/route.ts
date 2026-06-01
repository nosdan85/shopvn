import { NextRequest, NextResponse } from "next/server";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";
type C = { params: Promise<{ id: string }> };
export async function PUT(request: NextRequest, { params }: C) {
  const { id } = await params;
  const token = request.headers.get("authorization") || "";
  const body = await request.json();
  const res = await fetch(`${API_BASE_URL}/api/shop/owner/games/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) }, body: JSON.stringify(body) });
  return NextResponse.json(await res.json(), { status: res.status });
}
export async function DELETE(request: NextRequest, { params }: C) {
  const { id } = await params;
  const token = request.headers.get("authorization") || "";
  const res = await fetch(`${API_BASE_URL}/api/shop/owner/games/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) } });
  return NextResponse.json(await res.json(), { status: res.status });
}
