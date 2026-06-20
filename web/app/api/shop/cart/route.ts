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

async function proxyCartRequest(method: "GET" | "PUT" | "DELETE", request: NextRequest) {
 const token = request.headers.get("authorization") || "";
 const headers: HeadersInit = {
 ...(token ? { Authorization: token } : {}),
 };

 const init: RequestInit = {
 method,
 headers,
 cache: "no-store",
 };

 if (method === "PUT") {
 const body = await request.json();
 init.headers = {
 ...headers,
 "Content-Type": "application/json",
 };
 init.body = JSON.stringify(body);
 }

 const response = await fetch(backendUrl("/api/shop/cart"), init);
 const data = await parseJsonSafe(response);

 return NextResponse.json(data, { status: response.status, headers: noStoreHeaders() });
}

export async function GET(request: NextRequest) {
 try {
 return await proxyCartRequest("GET", request);
 } catch (error) {
 console.error("[shop/cart proxy] GET error:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}

export async function PUT(request: NextRequest) {
 try {
 return await proxyCartRequest("PUT", request);
 } catch (error) {
 console.error("[shop/cart proxy] PUT error:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}

export async function DELETE(request: NextRequest) {
 try {
 return await proxyCartRequest("DELETE", request);
 } catch (error) {
 console.error("[shop/cart proxy] DELETE error:", error);
 return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
 }
}
