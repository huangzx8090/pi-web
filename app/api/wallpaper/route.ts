import { createReadStream, existsSync, statSync } from "node:fs";
import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { dirname, extname, join } from "node:path";
import { homedir } from "node:os";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { NextRequest, NextResponse } from "next/server";
import { getAgentDir } from "@earendil-works/pi-coding-agent";

// The wallpaper lives in pi-web's own directory in the agent dir, so it needs
// no allowed-roots entry: /api/files refuses paths outside a project, and a
// picture the user picks can be anywhere (~/Pictures, an AirDrop folder, the
// Desktop). Copying it in sidesteps both the whitelist and the picture moving
// or being deleted where it was found.
//
//   GET    -> the image bytes (long-cached; the client busts with ?v=)
//   PUT    -> { sourcePath } copies that local file in as the wallpaper
//   DELETE -> removes it
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".heic": "image/heic",
};

function wallpaperDir(agentDir = getAgentDir()): string {
  return join(agentDir, "pi-web");
}

function findWallpaper(agentDir = getAgentDir()): { path: string; mime: string } | null {
  const dir = wallpaperDir(agentDir);
  for (const ext of Object.keys(MIME_BY_EXT)) {
    const candidate = join(dir, `wallpaper${ext}`);
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return { path: candidate, mime: MIME_BY_EXT[ext] };
    }
  }
  return null;
}

async function etagOf(path: string): Promise<string> {
  const info = await stat(path);
  const digest = createHash("sha1").update(`${path}:${info.mtimeMs}:${info.size}`).digest("hex");
  return `"wallpaper-${digest.slice(0, 16)}"`;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const found = findWallpaper();
  if (!found) return new NextResponse("No wallpaper", { status: 404 });

  const etag = await etagOf(found.path);
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const info = await stat(found.path);
  const stream = Readable.toWeb(createReadStream(found.path)) as WebReadableStream<Uint8Array>;
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": found.mime,
      "Content-Length": String(info.size),
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as { sourcePath?: unknown };
    if (typeof body.sourcePath !== "string" || body.sourcePath.trim().length === 0) {
      return NextResponse.json({ error: "sourcePath must be a non-empty path" }, { status: 400 });
    }

    const source = body.sourcePath.trim();
    const ext = extname(source).toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) {
      return NextResponse.json(
        { error: `Not a supported image (${ext || "no extension"}): png, jpg, webp, gif, avif, bmp, heic` },
        { status: 400 },
      );
    }

    const info = await stat(source).catch(() => null);
    if (!info?.isFile()) {
      return NextResponse.json({ error: `No such file: ${source}` }, { status: 404 });
    }
    // A wallpaper is decorative; anything past a few tens of MB is a scan or a
    // raw photo and will only slow the page down.
    if (info.size > 40 * 1024 * 1024) {
      return NextResponse.json({ error: "Image is larger than 40 MB" }, { status: 413 });
    }

    const dir = wallpaperDir();
    await mkdir(dir, { recursive: true });
    // Drop any previous wallpaper first so only one file remains.
    for (const other of Object.keys(MIME_BY_EXT)) {
      if (other !== ext) await rm(join(dir, `wallpaper${other}`), { force: true });
    }
    const dest = join(dir, `wallpaper${ext}`);
    await copyFile(source, dest);

    return NextResponse.json({ ok: true, mime, bytes: info.size });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  const dir = wallpaperDir();
  for (const ext of Object.keys(MIME_BY_EXT)) {
    await rm(join(dir, `wallpaper${ext}`), { force: true });
  }
  return NextResponse.json({ ok: true });
}
