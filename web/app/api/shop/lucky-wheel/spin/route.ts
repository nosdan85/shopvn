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
 const res = await fetch(backendUrl("/api/shop/lucky-wheel/spin"), {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 ...(token ? { Authorization: token } : {}),
 },
 body: JSON.stringify(await request.json().catch(() => ({}))),
 cache: "no-store",
 });
 const data = await parseJsonSafe(res);
 return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
 } catch (error) {
 console.error("Lucky wheel spin API error:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}
