import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { writePrivateFileAtomicSync } from "./atomic-file";

/**
 * Archived projects and conversations.
 *
 * Archiving is a soft hide: the JSONL files stay on disk so nothing is lost.
 * A conversation is hidden when its own id is archived OR its project key is
 * archived, which is what makes "archive a project" archive everything inside
 * it while still allowing individual conversations to be hidden on their own.
 */
export interface Archive {
  /** Project keys (see lib/project-identity.ts). */
  projects: string[];
  /** Session ids archived individually. */
  sessions: string[];
}

const EMPTY: Archive = { projects: [], sessions: [] };

export function getArchivePath(agentDir = getAgentDir()): string {
  return join(agentDir, "pi-web", "archive.json");
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))];
}

export function readArchive(archivePath = getArchivePath()): Archive {
  if (!existsSync(archivePath)) return { ...EMPTY, projects: [], sessions: [] };
  try {
    const parsed: unknown = JSON.parse(readFileSync(archivePath, "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...EMPTY, projects: [], sessions: [] };
    }
    const record = parsed as Record<string, unknown>;
    return { projects: toStringArray(record.projects), sessions: toStringArray(record.sessions) };
  } catch {
    return { ...EMPTY, projects: [], sessions: [] };
  }
}

export function writeArchive(archive: Archive, archivePath = getArchivePath()): Archive {
  const next: Archive = {
    projects: toStringArray(archive.projects),
    sessions: toStringArray(archive.sessions),
  };
  const dir = dirname(archivePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writePrivateFileAtomicSync(archivePath, JSON.stringify(next, null, 2));
  return next;
}

export function setArchived(
  kind: "project" | "session",
  id: string,
  archived: boolean,
  archivePath = getArchivePath(),
): Archive {
  const archive = readArchive(archivePath);
  const key = kind === "project" ? "projects" : "sessions";
  const set = new Set(archive[key]);
  if (archived) set.add(id);
  else set.delete(id);
  return writeArchive({ ...archive, [key]: [...set] }, archivePath);
}

/** Drop a project key from both archive lists (used when the project is deleted). */
export function clearArchivedProject(id: string, archivePath = getArchivePath()): Archive {
  const archive = readArchive(archivePath);
  return writeArchive(
    {
      projects: archive.projects.filter((project) => project !== id),
      sessions: archive.sessions,
    },
    archivePath,
  );
}
