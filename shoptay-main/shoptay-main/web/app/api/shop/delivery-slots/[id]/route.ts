import { NextRequest, NextResponse } from "next/server";
import { backendUrl, noStoreHeaders } from "@/lib/backendApi";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const token = request.headers.get("authorization") || "";
    const body = await request.json();
    const res = await fetch(backendUrl(`/api/shop/delivery-slots/${encodeURIComponent(id)}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ error: "Backend returned an invalid response" }));
    return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Update delivery slot API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const token = request.headers.get("authorization") || "";
    const res = await fetch(backendUrl(`/api/shop/delivery-slots/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ error: "Backend returned an invalid response" }));
    return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Delete delivery slot API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}
