import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return { error: "Backend request failed" };
  }
};

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization") || "";
    const query = request.nextUrl.searchParams.toString();
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/linked-users${query ? `?${query}` : ""}`, {
      headers: token ? { Authorization: token } : undefined,
      cache: "no-store",
    });

    const data = await parseJsonSafe(res);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[owner/linked-users proxy] GET failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
