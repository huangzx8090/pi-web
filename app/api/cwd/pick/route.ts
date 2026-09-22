import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import {
  buildChooseFolderScript,
  isUserCanceled,
  parsePickedPath,
} from "@/lib/apple-folder-dialog";
import { allowFileRoot } from "@/lib/file-access";
import { projectIdentityKey } from "@/lib/project-identity";
import { resolveProject } from "@/lib/worktree";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

const PICK_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * POST /api/cwd/pick  body: { prompt?: string }
 *
 * Opens the operating system's native folder chooser on the machine running
 * the server and returns the selected directory. macOS uses Finder via
 * `osascript`; other platforms get `501 { fallback: true }` so the client can
 * fall back to the in-app directory browser.
 */
export async function POST(request: NextRequest) {
  if (process.platform !== "darwin") {
    return NextResponse.json(
      { fallback: true, error: "Native folder picker is only available on macOS" },
      { status: 501 },
    );
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const prompt = (body as { prompt?: unknown } | null)?.prompt;

  let stdout: string;
  try {
    const result = await execFileAsync(
      "osascript",
      ["-e", buildChooseFolderScript(prompt)],
      { timeout: PICK_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
    );
    stdout = result.stdout;
  } catch (error) {
    const message = [
      error instanceof Error ? error.message : String(error),
      (error as { stderr?: string }).stderr ?? "",
    ].join(" ");
    if (isUserCanceled(message)) {
      return NextResponse.json({ canceled: true });
    }
    // No GUI session / osascript unavailable — let the client browse in-app.
    return NextResponse.json({ fallback: true, error: message.trim() }, { status: 501 });
  }

  const picked = parsePickedPath(stdout);
  try {
    const info = statSync(picked);
    if (!info.isDirectory()) {
      return NextResponse.json({ error: `Not a directory: ${picked}` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: `Directory does not exist: ${picked}` }, { status: 400 });
  }

  allowFileRoot(picked);
  const project = await resolveProject(picked);
  return NextResponse.json({
    cwd: picked,
    projectRoot: project.projectRoot,
    projectKey: projectIdentityKey(project.projectRoot),
  });
}
