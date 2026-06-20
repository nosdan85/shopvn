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

export async function GET(request: NextRequest) {
 try {
 const token = request.headers.get("authorization") || "";
 const query = request.nextUrl.searchParams.toString();
 const res = await fetch(backendUrl(`/api/shop/owner/linked-users${query ? `?${query}` : ""}`), {
 headers: token ? { Authorization: token } : undefined,
 cache: "no-store",
 });

 const data = await parseJsonSafe(res);
 return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
 } catch (error) {
 console.error("[owner/linked-users proxy] GET failed:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}
