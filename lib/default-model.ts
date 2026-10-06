import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import lockfile from "proper-lockfile";
import { writePrivateFileAtomicSync } from "./atomic-file";

export interface DefaultModelRef {
  provider: string;
  modelId: string;
}

type StoredSettings = Record<string, unknown>;

/**
 * Read/write pi's global default model (`defaultProvider` + `defaultModel` in
 * `~/.pi/agent/settings.json`). New AgentSessions without an explicit model use
 * this value, so configuring it here also configures the pi CLI.
 */
export function getDefaultModelSettingsPath(agentDir = getAgentDir()): string {
  return join(agentDir, "settings.json");
}

function readStoredSettings(settingsPath: string): StoredSettings {
  if (!existsSync(settingsPath)) return {};
  const parsed: unknown = JSON.parse(readFileSync(settingsPath, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid settings.json: expected an object");
  }
  return parsed as StoredSettings;
}

function storedDefaultModel(settings: StoredSettings): DefaultModelRef | null {
  const provider = settings.defaultProvider;
  const modelId = settings.defaultModel;
  if (typeof provider !== "string" || provider.trim().length === 0) return null;
  if (typeof modelId !== "string" || modelId.trim().length === 0) return null;
  return { provider, modelId };
}

export function readDefaultModel(
  settingsPath = getDefaultModelSettingsPath(),
): DefaultModelRef | null {
  return storedDefaultModel(readStoredSettings(settingsPath));
}

/**
 * Persist or clear the global default model. Unknown settings fields are kept
 * intact and the write takes the same `proper-lockfile` lock pi's
 * `SettingsManager` uses, so a concurrent pi process cannot lose the update.
 */
export async function writeDefaultModel(
  model: DefaultModelRef | null,
  settingsPath = getDefaultModelSettingsPath(),
): Promise<DefaultModelRef | null> {
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
      delete settings.defaultProvider;
      delete settings.defaultModel;
    } else {
      settings.defaultProvider = model.provider;
      settings.defaultModel = model.modelId;
    }
    writePrivateFileAtomicSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
  } finally {
    await release();
  }

  return readDefaultModel(settingsPath);
}
