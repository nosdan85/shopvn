import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

async function getResponseData(response: Response) {
  try {
    return await response.json();
  } catch {
    return { error: "Backend request failed" };
  }
}

async function proxyCartRequest(method: "GET" | "PUT" | "DELETE", request: NextRequest) {
  const token = request.headers.get("authorization") || "";
  const headers: HeadersInit = {
    ...(token ? { Authorization: token } : {}),
  };

  const init: RequestInit = {
    method,
    headers,
  };

  if (method === "PUT") {
    const body = await request.json();
    init.headers = {
      ...headers,
      "Content-Type": "application/json",
    };
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}/api/shop/cart`, init);
  const data = await getResponseData(response);

  return NextResponse.json(data, { status: response.status });
}

export async function GET(request: NextRequest) {
  try {
    return await proxyCartRequest("GET", request);
  } catch (error) {
    console.error("[shop/cart proxy] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxyCartRequest("PUT", request);
  } catch (error) {
    console.error("[shop/cart proxy] PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await proxyCartRequest("DELETE", request);
  } catch (error) {
    console.error("[shop/cart proxy] DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
