import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return { error: "Backend request failed" };
  }
};

type RouteContext = { params: Promise<{ discordId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { discordId } = await params;
    const token = request.headers.get("authorization") || "";
    const res = await fetch(`${API_BASE_URL}/api/shop/owner/linked-users/${encodeURIComponent(discordId)}`, {
      method: "DELETE",
      headers: token ? { Authorization: token } : undefined,
    });

    const data = await parseJsonSafe(res);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[owner/linked-users proxy] DELETE failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
