import { NextResponse } from "next/server";
import { readArchive, setArchived } from "@/lib/archive";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

let mutationQueue: Promise<unknown> = Promise.resolve();

/** Serialize read-modify-write on the shared archive file. */
function mutate<T>(operation: () => T): Promise<T> {
  const run = mutationQueue.then(operation, operation);
  mutationQueue = run.catch(() => undefined);
  return run;
}

// GET /api/archive — archived project keys and session ids.
export async function GET() {
  return NextResponse.json(readArchive());
}

// POST /api/archive  body: { kind: "project" | "session", id: string, archived: boolean }
export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record = asRecord(body);
  const { kind, id, archived } = record ?? {};
  if (kind !== "project" && kind !== "session") {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }
  if (typeof id !== "string" || id.length === 0 || typeof archived !== "boolean") {
    return NextResponse.json({ error: "invalid archive entry" }, { status: 400 });
  }
  return NextResponse.json(await mutate(() => setArchived(kind, id, archived)));
}
