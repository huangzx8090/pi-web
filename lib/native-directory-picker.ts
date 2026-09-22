"use client";

/**
 * Native folder chooser.
 *
 * A browser cannot return an absolute path from a native dialog, but Pi Web's
 * server runs on the same machine, so it can pop the OS picker (macOS Finder
 * via `osascript`) and hand the path back. When that is unavailable — a
 * non-macOS host, no GUI session, or an Electron-style desktop bridge is not
 * present — callers fall back to the in-app directory browser.
 */
export type NativePickResult =
  | { status: "picked"; cwd: string }
  | { status: "canceled" }
  | { status: "unavailable" };

export async function pickNativeDirectory(prompt: string): Promise<NativePickResult> {
  if (typeof window !== "undefined" && window.piDesktop?.selectDirectory) {
    try {
      const cwd = await window.piDesktop.selectDirectory();
      return cwd ? { status: "picked", cwd } : { status: "canceled" };
    } catch {
      // Fall through to the server-side picker.
    }
  }

  try {
    const response = await fetch("/api/cwd/pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      canceled?: boolean;
      cwd?: string;
      fallback?: boolean;
    };
    if (data.canceled) return { status: "canceled" };
    if (response.ok && data.cwd) return { status: "picked", cwd: data.cwd };
    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
