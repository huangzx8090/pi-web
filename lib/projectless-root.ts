import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import lockfile from "proper-lockfile";
import { writePrivateFileAtomicSync } from "./atomic-file";
import { getPiWebSettingsPath } from "./title-model";

/**
 * Where conversations that belong to no project put their workspace.
 *
 * This mirrors Codex: `~/Documents/Codex` by default, overridable in config
 * (`[desktop] projectlessWorkspaceRoot` in `~/.codex/config.toml`, surfaced as
 * Settings › General › Projectless task folder). Codex filed its own bug about
 * `~/Documents` being iCloud-synced on macOS, which is exactly why the root has
 * to be configurable rather than hard-coded.
 *
 * Layout under the root, same as Codex: `<root>/<YYYY-MM-DD>/<chat folder>/` —
 * one folder per conversation, so two chats never share outputs.
 */
export const DEFAULT_PROJECTLESS_ROOT = join(homedir(), "Documents", "PiWeb");

type StoredSettings = Record<string, unknown>;

function readStoredSettings(settingsPath: string): StoredSettings {
  if (!existsSync(settingsPath)) return {};
  const parsed: unknown = JSON.parse(readFileSync(settingsPath, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid pi-web settings.json: expected an object");
  }
  return parsed as StoredSettings;
}

/** `~` and `~/x` are stored as typed and expanded only when used. */
export function expandRoot(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return join(homedir(), value.slice(2));
  return value;
}

export function readProjectlessRoot(settingsPath = getPiWebSettingsPath()): string {
  try {
    const stored = readStoredSettings(settingsPath).projectlessWorkspaceRoot;
    if (typeof stored === "string" && stored.trim().length > 0) return expandRoot(stored.trim());
  } catch {
    // A malformed settings file falls back to the default, as Codex does.
  }
  return DEFAULT_PROJECTLESS_ROOT;
}

/**
 * Persist the root. `null` restores the default. Unknown fields are preserved
 * and the write takes the same lock shape as the other pi-web settings.
 */
export async function writeProjectlessRoot(
  root: string | null,
  settingsPath = getPiWebSettingsPath(),
): Promise<string> {
  if (root !== null) {
    const expanded = expandRoot(root.trim());
    if (!expanded || (!expanded.startsWith("~") && !isAbsolute(expanded))) {
      throw new Error("The chat folder must be an absolute path");
    }
    mkdirSync(expandRoot(expanded), { recursive: true });
  }

  mkdirSync(dirname(settingsPath), { recursive: true });
  try {
    writeFileSync(settingsPath, "{}\n", { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }

  const release = await lockfile.lock(settingsPath, { realpath: false, retries: 10 });
  try {
    const settings = readStoredSettings(settingsPath);
    if (root === null) delete settings.projectlessWorkspaceRoot;
    else settings.projectlessWorkspaceRoot = root.trim();
    writePrivateFileAtomicSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  } finally {
    await release();
  }

  return readProjectlessRoot(settingsPath);
}
