import type { GitFileStatus } from "./git-types";

export interface GitPorcelainEntry {
  path: string;
  originalPath?: string;
  indexStatus: string;
  worktreeStatus: string;
}

function usesRenamePath(indexStatus: string, worktreeStatus: string): boolean {
  return indexStatus === "R" || indexStatus === "C" || worktreeStatus === "R" || worktreeStatus === "C";
}

export function parseGitPorcelainV1(output: string): GitPorcelainEntry[] {
  const records = output.split("\0");
  const entries: GitPorcelainEntry[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record || record.length < 4 || record[2] !== " ") continue;
    const indexStatus = record[0];
    const worktreeStatus = record[1];
    const entry: GitPorcelainEntry = {
      path: record.slice(3),
      indexStatus,
      worktreeStatus,
    };
    if (usesRenamePath(indexStatus, worktreeStatus)) {
      entry.originalPath = records[++i] || undefined;
    }
    entries.push(entry);
  }

  return entries;
}

const CONFLICT_STATUSES = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);

export interface GitLineStats {
  additions: number;
  deletions: number;
}

/**
 * Parse `git diff --numstat -z` into per-file line deltas keyed by the path
 * relative to the repository root — the same key `git status --porcelain` uses.
 *
 * With `-z` a rename/copy entry leaves the path field empty and appends the old
 * and new paths as two extra NUL-terminated tokens. Binary files report `-`,
 * which fails the integer check and is skipped.
 */
export function parseNumstatZ(output: string): Map<string, GitLineStats> {
  const stats = new Map<string, GitLineStats>();
  const tokens = output.split("\0");
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    const parts = token.split("\t");
    if (parts.length < 3) continue;
    const additions = Number(parts[0]);
    const deletions = Number(parts[1]);
    let gitPath = parts.slice(2).join("\t");
    if (!gitPath) {
      gitPath = tokens[i + 2] ?? "";
      i += 2;
    }
    if (!gitPath) continue;
    if (!Number.isInteger(additions) || !Number.isInteger(deletions)) continue;
    stats.set(gitPath, { additions, deletions });
  }
  return stats;
}

export function classifyGitStatus(entry: GitPorcelainEntry): Pick<GitFileStatus, "status" | "code"> {
  const pair = `${entry.indexStatus}${entry.worktreeStatus}`;
  if (pair === "??") return { status: "untracked", code: "U" };
  if (CONFLICT_STATUSES.has(pair) || pair.includes("U")) return { status: "conflict", code: "C" };
  if (pair.includes("D")) return { status: "deleted", code: "D" };
  if (pair.includes("R") || pair.includes("C")) return { status: "renamed", code: "R" };
  if (pair.includes("A")) return { status: "added", code: "A" };
  return { status: "modified", code: "M" };
}
