import { NextRequest, NextResponse } from "next/server";
import { backendUrl, noStoreHeaders } from "@/lib/backendApi";

type C = { params: Promise<{ id: string }> };

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return { error: "Backend request failed" };
  }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(request: NextRequest, { params }: C) {
  try {
    const { id } = await params;
    const token = request.headers.get("authorization") || "";
    const body = await request.json();
    const res = await fetch(backendUrl(`/api/shop/owner/games/${encodeURIComponent(id)}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await parseJsonSafe(res), { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Update game API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function DELETE(request: NextRequest, { params }: C) {
  try {
    const { id } = await params;
    const token = request.headers.get("authorization") || "";
    const res = await fetch(backendUrl(`/api/shop/owner/games/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      cache: "no-store",
    });
    return NextResponse.json(await parseJsonSafe(res), { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Delete game API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}
