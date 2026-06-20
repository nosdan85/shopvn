import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
 const username = request.nextUrl.searchParams.get("username");
 if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

 try {
 const backendRes = await fetch(`${API_BASE_URL}/api/shop/roblox/search?username=${encodeURIComponent(username)}`, {
 cache: "no-store",
 });
 const data = await backendRes.json();
 return NextResponse.json(data, { status: backendRes.status });
 } catch (error) {
 console.error("Roblox search error:", error);
 return NextResponse.json({ error: "Search failed" }, { status: 500 });
 }
}
