import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { writePrivateFileAtomicSync } from "./atomic-file";

/** 置顶的项目（project key）与对话（session id），服务端持久化。 */
export interface Pins {
  projects: string[];
  sessions: string[];
}

const EMPTY: Pins = { projects: [], sessions: [] };

export function getPinsPath(agentDir = getAgentDir()): string {
  return join(agentDir, "pi-web", "pins.json");
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))];
}

export function readPins(pinsPath = getPinsPath()): Pins {
  if (!existsSync(pinsPath)) return { ...EMPTY };
  try {
    const parsed: unknown = JSON.parse(readFileSync(pinsPath, "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { ...EMPTY };
    const record = parsed as Record<string, unknown>;
    return { projects: toStringArray(record.projects), sessions: toStringArray(record.sessions) };
  } catch {
    return { ...EMPTY };
  }
}

export function writePins(pins: Pins, pinsPath = getPinsPath()): Pins {
  const next: Pins = { projects: toStringArray(pins.projects), sessions: toStringArray(pins.sessions) };
  const dir = dirname(pinsPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writePrivateFileAtomicSync(pinsPath, JSON.stringify(next, null, 2));
  return next;
}

export function setPin(
  kind: "project" | "session",
  id: string,
  pinned: boolean,
  pinsPath = getPinsPath(),
): Pins {
  const pins = readPins(pinsPath);
  const key = kind === "project" ? "projects" : "sessions";
  const set = new Set(pins[key]);
  if (pinned) set.add(id);
  else set.delete(id);
  return writePins({ ...pins, [key]: [...set] }, pinsPath);
}

/** 按给定顺序覆写某一类置顶项的排列。 */
export function setPinOrder(
  kind: "project" | "session",
  order: string[],
  pinsPath = getPinsPath(),
): Pins {
  const pins = readPins(pinsPath);
  const key = kind === "project" ? "projects" : "sessions";
  return writePins({ ...pins, [key]: order }, pinsPath);
}
