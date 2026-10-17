import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import {
  buildChooseFileScript,
  isFileUserCanceled,
  parsePickedFilePath,
} from "@/lib/apple-file-dialog";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

const PICK_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * POST /api/wallpaper/pick  body: { prompt?: string }
 *
 * Opens the macOS native file chooser for pictures and copies the chosen file
 * in as the wallpaper. Non-macOS hosts and a dismissed dialog both answer
 * { canceled: true } so the client can fall back to typing a path.
 */
export async function POST(request: Request) {
  if (process.platform !== "darwin") {
    return NextResponse.json({ canceled: true, fallback: true, error: "Native file picker is only available on macOS" }, { status: 501 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const prompt = (body as { prompt?: unknown } | null)?.prompt;

  try {
    const { stdout } = await execFileAsync("osascript", ["-e", buildChooseFileScript(prompt)], {
      timeout: PICK_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    const sourcePath = parsePickedFilePath(stdout);
    if (!sourcePath) {
      return NextResponse.json({ canceled: true, error: "No path returned" }, { status: 400 });
    }
    return NextResponse.json({ canceled: false, sourcePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isFileUserCanceled(message)) return NextResponse.json({ canceled: true });
    return NextResponse.json({ canceled: true, error: message }, { status: 500 });
  }
}
