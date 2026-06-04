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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get("authorization") || "";
    const res = await fetch(backendUrl("/api/shop/referral/preview"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: token } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await parseJsonSafe(res);
    return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("referral preview API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}
