import { statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { clearArchivedProject } from "@/lib/archive";
import { allowFileRoot } from "@/lib/file-access";
import { setPin } from "@/lib/pins";
import { projectIdentityKey } from "@/lib/project-identity";
import {
  MAX_PROJECT_NAME_LENGTH,
  readProjectRegistry,
  removeProject,
  renameProject,
  upsertProject,
} from "@/lib/project-registry";
import { resolveProject } from "@/lib/worktree";

export const dynamic = "force-dynamic";

function normalizeCwd(cwd: string): string {
  if (cwd === "~") return homedir();
  if (cwd.startsWith("~/")) return resolve(homedir(), cwd.slice(2));
  return isAbsolute(cwd) ? cwd : resolve(cwd);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

let mutationQueue: Promise<unknown> = Promise.resolve();

/**
 * Serialize registry mutations. Concurrent POST/PATCH/DELETE requests would
 * otherwise read-modify-write the same JSON file and drop entries.
 */
function mutate<T>(operation: () => T): Promise<T> {
  const run = mutationQueue.then(operation, operation);
  mutationQueue = run.catch(() => undefined);
  return run;
}

// GET /api/projects — list user-created projects.
export async function GET() {
  return NextResponse.json(readProjectRegistry());
}

// POST /api/projects  body: { cwd: string, name?: string }
// Validate a folder, add it to the project registry, and return the record.
export async function POST(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record = asRecord(body);
  const cwd = typeof record?.cwd === "string" ? record.cwd.trim() : "";
  if (!cwd) {
    return NextResponse.json({ error: "Path is required" }, { status: 400 });
  }
  const name = typeof record?.name === "string" ? record.name : "";

  const normalizedCwd = normalizeCwd(cwd);
  try {
    const info = statSync(normalizedCwd);
    if (!info.isDirectory()) {
      return NextResponse.json({ error: `Path is not a directory: ${cwd}` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: `Directory does not exist: ${cwd}` }, { status: 400 });
  }

  allowFileRoot(normalizedCwd);
  const resolved = await resolveProject(normalizedCwd);
  const key = projectIdentityKey(resolved.projectRoot);
  const { project } = await mutate(() => upsertProject({
    key,
    root: resolved.projectRoot,
    name: name.slice(0, MAX_PROJECT_NAME_LENGTH),
  }));
  return NextResponse.json({ project, cwd: normalizedCwd });
}

// PATCH /api/projects  body: { key: string, name: string }
export async function PATCH(request: NextRequest) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record = asRecord(body);
  const key = typeof record?.key === "string" ? record.key.trim() : "";
  const name = typeof record?.name === "string" ? record.name : "";
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  const registry = await mutate(() => renameProject(key, name));
  if (!registry) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(registry);
}

// DELETE /api/projects?key=... — remove from the registry (sessions untouched).
export async function DELETE(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")?.trim() ?? "";
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
  const registry = await mutate(() => {
    // A deleted project must not linger in pins or the archive.
    try { setPin("project", key, false); } catch { /* best effort */ }
    try { clearArchivedProject(key); } catch { /* best effort */ }
    return removeProject(key);
  });
  return NextResponse.json(registry);
}
