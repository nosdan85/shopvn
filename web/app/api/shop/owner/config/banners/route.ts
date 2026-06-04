import { NextRequest, NextResponse } from "next/server";
import { backendUrl, noStoreHeaders } from "@/lib/backendApi";

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return { error: "Backend request failed" };
  }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const body = await request.json();
    const res = await fetch(backendUrl("/api/shop/owner/config/banners"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await parseJsonSafe(res), { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Save banners API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const body = await request.json();
    const res = await fetch(backendUrl("/api/shop/owner/config/banners"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return NextResponse.json(await parseJsonSafe(res), { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Delete banners API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}
