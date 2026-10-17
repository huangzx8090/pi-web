import { NextResponse } from "next/server";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { allowFileRoot } from "@/lib/file-access";
import { readProjectlessRoot, writeProjectlessRoot } from "@/lib/projectless-root";

// Conversations that belong to no project get their OWN workspace, laid out the
// way Codex lays out projectless chats:
//
//   <root>/2026-10-17/new-chat/
//
//   root        date        one folder per conversation
//
// The root is configurable (Settings › General › 临时对话目录, stored as
// `projectlessWorkspaceRoot`), mirroring Codex's `[desktop]
// projectlessWorkspaceRoot`. The default is `~/Documents/PiWeb`, the same shape
// as Codex's `~/Documents/Codex`.
//
// Isolation is the point: two temporary conversations must not read each
// other's files or outputs. Old `~/pi-cwd-*` and `~/pi-chats` folders keep
// working: lib/file-access.ts still allows them and the sidebar files their
// sessions under 「对话」.

function localDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `new-chat`, then `new-chat-2`, … — Codex's default folder name for a chat
 * that has not been named yet, made unique inside the day's folder. */
function nextChatFolder(dayDir: string): string {
  const taken = new Set(existsSync(dayDir) ? readdirSync(dayDir) : []);
  if (!taken.has("new-chat")) return join(dayDir, "new-chat");
  for (let n = 2; n < 10_000; n += 1) {
    const name = `new-chat-${n}`;
    if (!taken.has(name)) return join(dayDir, name);
  }
  throw new Error("Too many chats in one day");
}

/** The configured root (GET) — the Settings field reads this. */
export async function GET() {
  try {
    return NextResponse.json({ root: readProjectlessRoot() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

/** Change the root (PUT). Existing chats keep the folders they were given. */
export async function PUT(request: Request) {
  try {
    const body = await request.json() as { root?: unknown };
    if (typeof body.root !== "string" || body.root.trim().length === 0) {
      return NextResponse.json({ error: "root must be a non-empty path" }, { status: 400 });
    }
    const root = await writeProjectlessRoot(body.root);
    allowFileRoot(root);
    return NextResponse.json({ root });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

export async function POST() {
  try {
    const root = readProjectlessRoot();
    const dayDir = join(root, localDate());
    mkdirSync(dayDir, { recursive: true });
    const dir = nextChatFolder(dayDir);
    mkdirSync(dir, { recursive: true });
    allowFileRoot(dir);
    return NextResponse.json({ cwd: dir });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
