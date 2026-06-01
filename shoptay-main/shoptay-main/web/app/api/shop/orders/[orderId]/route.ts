import { NextRequest, NextResponse } from "next/server";
import { backendUrl, noStoreHeaders } from "@/lib/backendApi";

type RouteContext = { params: Promise<{ orderId: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { orderId } = await params;
    const token = request.headers.get("authorization") || "";
    const contentType = request.headers.get("content-type") || "";
    const isMultipart = contentType.toLowerCase().includes("multipart/form-data");
    const body = isMultipart ? await request.formData() : await request.json();
    const action = request.nextUrl.searchParams.get("action");
    const encodedOrderId = encodeURIComponent(orderId);

    let endpoint = "";
    if (action === "link-roblox") {
      endpoint = backendUrl(`/api/shop/orders/${encodedOrderId}/link-roblox`);
    } else if (action === "delivery-slot") {
      endpoint = backendUrl(`/api/shop/orders/${encodedOrderId}/delivery-slot`);
    } else if (action === "confirm-delivery") {
      endpoint = backendUrl(`/api/shop/orders/${encodedOrderId}/confirm-delivery`);
    } else if (action === "create-ticket") {
      endpoint = backendUrl("/api/shop/create-ticket");
    } else if (action === "create-ticket-paypal-ff") {
      endpoint = backendUrl("/api/shop/create-ticket-paypal-ff");
    } else if (action === "create-ticket-ltc") {
      endpoint = backendUrl("/api/shop/create-ticket-ltc");
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400, headers: noStoreHeaders() });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...(!isMultipart ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: token } : {}),
      },
      body: isMultipart ? body : JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ error: "Backend returned an invalid response" }));
    return NextResponse.json(data, { status: res.status, headers: noStoreHeaders() });
  } catch (error) {
    console.error("Order action API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: noStoreHeaders() });
  }
}
