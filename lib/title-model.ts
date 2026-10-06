import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import lockfile from "proper-lockfile";
import { writePrivateFileAtomicSync } from "./atomic-file";

export interface TitleModelRef {
  provider: string;
  modelId: string;
}

type StoredSettings = Record<string, unknown>;

/**
 * pi-web's own settings file, kept next to archive.json / pins.json rather than
 * in pi's `settings.json`. Naming is a pi-web concern, and owning the file means
 * nothing pi does to its own settings can rewrite this one.
 */
export function getPiWebSettingsPath(agentDir = getAgentDir()): string {
  return join(agentDir, "pi-web", "settings.json");
}

function readStoredSettings(settingsPath: string): StoredSettings {
  if (!existsSync(settingsPath)) return {};
  const parsed: unknown = JSON.parse(readFileSync(settingsPath, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid pi-web settings.json: expected an object");
  }
  return parsed as StoredSettings;
}

function storedTitleModel(settings: StoredSettings): TitleModelRef | null {
  const provider = settings.titleProvider;
  const modelId = settings.titleModel;
  if (typeof provider !== "string" || provider.trim().length === 0) return null;
  if (typeof modelId !== "string" || modelId.trim().length === 0) return null;
  return { provider, modelId };
}

export function readTitleModel(settingsPath = getPiWebSettingsPath()): TitleModelRef | null {
  return storedTitleModel(readStoredSettings(settingsPath));
}

/**
 * Persist or clear the model used for session titles. `null` means "name with
 * the session's own model", which is also what an unset value does. Unknown
 * fields are preserved and the write takes the same lock shape pi uses, so a
 * concurrent writer cannot lose the update.
 */
export async function writeTitleModel(
  model: TitleModelRef | null,
  settingsPath = getPiWebSettingsPath(),
): Promise<TitleModelRef | null> {
  mkdirSync(dirname(settingsPath), { recursive: true });
  try {
    writeFileSync(settingsPath, "{}\n", { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }

  const release = await lockfile.lock(settingsPath, { realpath: false, retries: 10 });
  try {
    const settings = readStoredSettings(settingsPath);
    if (model === null) {
      delete settings.titleProvider;
      delete settings.titleModel;
    } else {
      settings.titleProvider = model.provider;
      settings.titleModel = model.modelId;
    }
    writePrivateFileAtomicSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  } finally {
    await release();
  }

  return readTitleModel(settingsPath);
}
