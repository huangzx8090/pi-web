import { NextResponse } from "next/server";
import { readPins, setPin, setPinOrder } from "@/lib/pins";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(readPins());
}

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { kind, id, pinned, order } = body as {
    kind?: unknown;
    id?: unknown;
    pinned?: unknown;
    order?: unknown;
  };
  if (kind !== "project" && kind !== "session") {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  // 重排：body 带 order 数组
  if (Array.isArray(order)) {
    const ids = order.filter((v): v is string => typeof v === "string" && v.length > 0);
    return NextResponse.json(setPinOrder(kind, ids));
  }
  if (typeof id !== "string" || id.length === 0 || typeof pinned !== "boolean") {
    return NextResponse.json({ error: "invalid pin" }, { status: 400 });
  }
  return NextResponse.json(setPin(kind, id, pinned));
}
