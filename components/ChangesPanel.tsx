"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GitFileDiffResponse, GitFileStatus, GitStatusResponse } from "@/lib/git-types";
import { useI18n } from "@/hooks/useI18n";
import { DiffView } from "./DiffView";
import { GIT_STATUS_COLORS, GitStatusBadge } from "./GitStatusBadge";

interface Props {
  cwd: string | null;
  status: GitStatusResponse | null;
  loading: boolean;
  error: string | null;
  /** Bumped by the hook whenever the working tree actually changed. */
  revision: number;
  onRefresh: () => void;
  onOpenFile: (filePath: string) => void;
}

type InlineDiff = GitFileDiffResponse | "error" | "loading";

/**
 * Show the file path the way the user thinks about it: relative to the project
 * root first, then the repository root. Both come from the same realpath
 * resolution as `filePath`, so the prefix match is reliable on symlinked paths.
 */
function displayPath(filePath: string, cwd: string | null, repositoryRoot: string | null): string {
  for (const base of [cwd, repositoryRoot]) {
    if (!base) continue;
    const prefix = base.endsWith("/") ? base : `${base}/`;
    if (filePath.startsWith(prefix)) return filePath.slice(prefix.length);
  }
  return filePath;
}

export function ChangesPanel({
  cwd,
  status,
  loading,
  error,
  revision,
  onRefresh,
  onOpenFile,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [diffs, setDiffs] = useState<Record<string, InlineDiff>>({});
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const expandedKey = [...expanded].sort().join("\u0000");

  const files: GitFileStatus[] = status?.files ?? [];

  // Load the patch for every expanded file. `revision` re-runs this whenever the
  // working tree changed, which is what keeps an open hunk live.
  useEffect(() => {
    const paths = [...expandedRef.current];
    if (!cwd || paths.length === 0) return;
    let cancelled = false;

    setDiffs((prev) => {
      const next = { ...prev };
      for (const filePath of paths) if (!next[filePath]) next[filePath] = "loading";
      return next;
    });

    for (const filePath of paths) {
      void (async () => {
        try {
          const query = new URLSearchParams({ cwd, path: filePath }).toString();
          const response = await fetch(`/api/git/diff?${query}`);
          const data = response.ok ? (await response.json()) as GitFileDiffResponse : null;
          if (cancelled) return;
          setDiffs((prev) => ({ ...prev, [filePath]: data ?? "error" }));
        } catch {
          if (!cancelled) setDiffs((prev) => ({ ...prev, [filePath]: "error" }));
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [cwd, expandedKey, revision]);

  const toggleExpanded = useCallback((filePath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  }, []);

  const summaryLabel = status?.isGitRepository === false
    ? t("changes.notRepo")
    : t("changes.summary", {
        count: files.length,
        additions: status?.additions ?? 0,
        deletions: status?.deletions ?? 0,
      });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summaryLabel}
        </span>
        {files.length > 0 && (
          <span style={{ display: "flex", gap: 6, fontFamily: "var(--font-mono)", fontSize: 12, flexShrink: 0 }}>
            <span style={{ color: GIT_STATUS_COLORS.added }}>+{status?.additions ?? 0}</span>
            <span style={{ color: GIT_STATUS_COLORS.deleted }}>-{status?.deletions ?? 0}</span>
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          title={t("changes.refresh")}
          aria-label={t("changes.refresh")}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, padding: 0, flexShrink: 0,
            background: "none", border: "none", borderRadius: 4,
            color: loading ? "var(--accent)" : "var(--text-dim)", cursor: "pointer",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "4px 4px 12px" }}>
        {error && (
          <div style={{ padding: "10px 12px", fontSize: 12, color: "#f87171" }}>
            {t("changes.error")}
          </div>
        )}
        {!error && files.length === 0 && (
          <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-dim)" }}>
            {loading && !status ? t("changes.loading") : summaryLabel}
          </div>
        )}

        {files.map((file) => {
          const isOpen = expanded.has(file.filePath);
          const inline = diffs[file.filePath];
          return (
            <div key={file.filePath}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpanded(file.filePath)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleExpanded(file.filePath);
                  }
                }}
                title={file.filePath}
                className={`changes-row${isOpen ? " is-open" : ""}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 26,
                  padding: "0 8px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                <GitStatusBadge status={file} t={t} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-mono)",
                    color: file.status === "deleted" ? "var(--text-dim)" : "var(--text)",
                    textDecoration: file.status === "deleted" ? "line-through" : "none",
                  }}
                >
                  {displayPath(file.filePath, cwd, status?.repositoryRoot ?? null)}
                </span>
                <span style={{ display: "flex", gap: 6, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                  {file.additions > 0 && <span style={{ color: GIT_STATUS_COLORS.added }}>+{file.additions}</span>}
                  {file.deletions > 0 && <span style={{ color: GIT_STATUS_COLORS.deleted }}>-{file.deletions}</span>}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenFile(file.filePath);
                  }}
                  title={t("changes.openInViewer")}
                  aria-label={t("changes.openInViewer")}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, padding: 0, flexShrink: 0,
                    background: "none", border: "none", borderRadius: 4,
                    color: "var(--text-dim)", cursor: "pointer",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 3h6v6" /><path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                </button>
              </div>

              {isOpen && (
                <div style={{ margin: "2px 0 6px", border: "1px solid var(--border)", borderRadius: 4, overflow: "auto", maxHeight: 420 }}>
                  {inline === "loading" || inline === undefined ? (
                    <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-dim)" }}>{t("changes.loading")}</div>
                  ) : inline === "error" ? (
                    <div style={{ padding: "8px 12px", fontSize: 12, color: "#f87171" }}>{t("changes.error")}</div>
                  ) : inline.supported && inline.patch ? (
                    <DiffView patch={inline.patch} />
                  ) : (
                    <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-dim)" }}>{t("changes.unsupported")}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
