import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { writePrivateFileAtomicSync } from "./atomic-file";

/**
 * User-created projects (Codex-style).
 *
 * Pi Web derives most projects from session cwds, but that means a workspace
 * only appears in the sidebar after its first message. A project registry lets
 * the user create a project up front — pick a folder, give it a name — and see
 * it in the list (with "No chats yet") before any conversation exists.
 *
 * `key` is `projectIdentityKey(projectRoot)`, the same stable identity the
 * session list uses, so registry entries merge with session-derived projects
 * instead of duplicating them.
 */
export interface ProjectRecord {
  /** Stable identity shared with sessions (see lib/project-identity.ts). */
  key: string;
  /** Original project root path used for display and filesystem operations. */
  root: string;
  /** User-facing project name. Falls back to the folder name when empty. */
  name: string;
  /** ISO timestamp of creation. */
  createdAt: string;
}

export interface ProjectRegistry {
  projects: ProjectRecord[];
}

const EMPTY: ProjectRegistry = { projects: [] };
export const MAX_PROJECT_NAME_LENGTH = 120;

export function getProjectRegistryPath(agentDir = getAgentDir()): string {
  return join(agentDir, "pi-web", "projects.json");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function sanitizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_PROJECT_NAME_LENGTH);
}

function parseRecord(value: unknown): ProjectRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const key = sanitizeName(record.key);
  const root = typeof record.root === "string" ? record.root.trim() : "";
  if (!key || !root) return null;
  return {
    key,
    root,
    name: sanitizeName(record.name),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : "",
  };
}

export function readProjectRegistry(registryPath = getProjectRegistryPath()): ProjectRegistry {
  if (!existsSync(registryPath)) return { ...EMPTY, projects: [] };
  try {
    const parsed = asRecord(JSON.parse(readFileSync(registryPath, "utf8")));
    if (!parsed || !Array.isArray(parsed.projects)) return { ...EMPTY, projects: [] };
    const projects: ProjectRecord[] = [];
    const seen = new Set<string>();
    for (const entry of parsed.projects) {
      const record = parseRecord(entry);
      if (!record || seen.has(record.key)) continue;
      seen.add(record.key);
      projects.push(record);
    }
    return { projects };
  } catch {
    return { ...EMPTY, projects: [] };
  }
}

export function writeProjectRegistry(
  registry: ProjectRegistry,
  registryPath = getProjectRegistryPath(),
): ProjectRegistry {
  const projects: ProjectRecord[] = [];
  const seen = new Set<string>();
  for (const entry of registry.projects) {
    const record = parseRecord(entry);
    if (!record || seen.has(record.key)) continue;
    seen.add(record.key);
    projects.push(record);
  }
  const dir = dirname(registryPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writePrivateFileAtomicSync(registryPath, JSON.stringify({ projects }, null, 2));
  return { projects };
}

/** Create or update a project. Preserves createdAt and an omitted name. */
export function upsertProject(
  input: { key: string; root: string; name?: string; createdAt?: string },
  registryPath = getProjectRegistryPath(),
): { registry: ProjectRegistry; project: ProjectRecord } {
  const registry = readProjectRegistry(registryPath);
  const existing = registry.projects.find((project) => project.key === input.key);
  const project: ProjectRecord = {
    key: input.key,
    root: input.root,
    name: input.name !== undefined ? sanitizeName(input.name) : existing?.name ?? "",
    createdAt: existing?.createdAt || input.createdAt || new Date().toISOString(),
  };
  const projects = existing
    ? registry.projects.map((entry) => (entry.key === project.key ? project : entry))
    : [...registry.projects, project];
  return { registry: writeProjectRegistry({ projects }, registryPath), project };
}

/** Rename a project. Returns null when the key is not registered. */
export function renameProject(
  key: string,
  name: string,
  registryPath = getProjectRegistryPath(),
): ProjectRegistry | null {
  const registry = readProjectRegistry(registryPath);
  if (!registry.projects.some((project) => project.key === key)) return null;
  const projects = registry.projects.map((project) =>
    project.key === key ? { ...project, name: sanitizeName(name) } : project,
  );
  return writeProjectRegistry({ projects }, registryPath);
}

/** Remove a project from the registry. Sessions are untouched. */
export function removeProject(key: string, registryPath = getProjectRegistryPath()): ProjectRegistry {
  const registry = readProjectRegistry(registryPath);
  return writeProjectRegistry(
    { projects: registry.projects.filter((project) => project.key !== key) },
    registryPath,
  );
}

/** Registry entries that carry a custom, non-empty display name. */
export function getProjectNames(registryPath = getProjectRegistryPath()): Record<string, string> {
  const names: Record<string, string> = {};
  for (const project of readProjectRegistry(registryPath).projects) {
    if (project.name) names[project.key] = project.name;
  }
  return names;
}
