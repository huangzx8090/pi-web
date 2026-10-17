import { NextResponse } from "next/server";
import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { allowFileRoot } from "@/lib/file-access";

// POST /api/default-cwd
// Returns the one scratch workspace used by conversations that belong to no
// project (`~/pi-chats`), creating it on first use.
//
// It used to be `~/pi-cwd-<YYYYMMDD>`: one folder per day, created behind the
// user's back, so the home directory filled up with pi-cwd-* entries and each
// day's chats became their own bucket. Codex and Claude Code both tie a
// conversation to a directory but reuse a fixed one, which is what this does.
// Old `~/pi-cwd-*` folders keep working (lib/file-access.ts still allows them
// and the sidebar still files their sessions under 「对话」).
const SCRATCH_DIR = join(homedir(), "pi-chats");

export async function POST() {
  try {
    mkdirSync(SCRATCH_DIR, { recursive: true });
    allowFileRoot(SCRATCH_DIR);
    return NextResponse.json({ cwd: SCRATCH_DIR });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
