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
 const res = await fetch(backendUrl("/api/shop/owner/lucky-wheel"), {
 method: "GET",
 headers: token ? { Authorization: token } : undefined,
 cache: "no-store",
 });
 const data = await parseJsonSafe(res);
 return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
 } catch (error) {
 console.error("Owner lucky wheel API error:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}

export async function PUT(request: NextRequest) {
 try {
 const token = request.headers.get("authorization") || "";
 const body = await request.json();
 const res = await fetch(backendUrl("/api/shop/owner/lucky-wheel"), {
 method: "PUT",
 headers: {
 "Content-Type": "application/json",
 ...(token ? { Authorization: token } : {}),
 },
 body: JSON.stringify(body),
 cache: "no-store",
 });
 const data = await parseJsonSafe(res);
 return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
 } catch (error) {
 console.error("Owner lucky wheel save API error:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}
