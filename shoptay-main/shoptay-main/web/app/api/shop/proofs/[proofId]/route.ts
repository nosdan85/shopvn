import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || "http://localhost:5000";

type RouteContext = {
  params: Promise<{ proofId: string }>;
};

async function proxy(
  request: NextRequest,
  context: RouteContext,
  method: "PATCH" | "DELETE"
) {
  try {
    const { proofId } = await context.params;
    const token = request.headers.get("authorization") || "";
    const body = method === "PATCH" ? await request.text() : undefined;

    const res = await fetch(`${API_BASE_URL}/api/shop/proofs/${encodeURIComponent(proofId)}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      ...(body ? { body } : {}),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(`Proof ${method} proxy error:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context, "DELETE");
}
