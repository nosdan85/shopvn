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
 const token = request.headers.get("authorization") || "";
 const formData = await request.formData();
 const res = await fetch(backendUrl("/api/shop/owner/config/banners/upload"), {
 method: "POST",
 headers: token ? { Authorization: token } : undefined,
 body: formData,
 cache: "no-store",
 });
 return NextResponse.json(await parseJsonSafe(res), { status: res.status, headers: noStoreHeaders() });
 } catch (error) {
 console.error("Banner upload API error:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}
