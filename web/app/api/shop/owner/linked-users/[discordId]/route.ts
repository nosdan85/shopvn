import { NextRequest, NextResponse } from "next/server";
import { backendUrl, noStoreHeaders } from "@/lib/backendApi";

type RouteContext = { params: Promise<{ discordId: string }> };

const parseJsonSafe = async (res: Response) => {
 try {
 return await res.json();
 } catch {
 return { error: "Backend request failed" };
 }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(request: NextRequest, { params }: RouteContext) {
 try {
 const { discordId } = await params;
 const token = request.headers.get("authorization") || "";
 const res = await fetch(backendUrl(`/api/shop/owner/linked-users/${encodeURIComponent(discordId)}`), {
 method: "DELETE",
 headers: token ? { Authorization: token } : undefined,
 cache: "no-store",
 });

 const data = await parseJsonSafe(res);
 return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
 } catch (error) {
 console.error("[owner/linked-users proxy] DELETE failed:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}
