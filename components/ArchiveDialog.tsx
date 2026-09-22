"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SessionInfo } from "@/lib/types";
import { skillExpansionToCommand } from "@/lib/slash-display";
import { formatRelativeTime } from "@/lib/i18n/format";
import { useI18n } from "@/hooks/useI18n";

export interface ArchivedProjectItem {
  key: string;
  root: string;
  name: string;
  count: number;
}

interface Props {
  projects: ArchivedProjectItem[];
  sessions: SessionInfo[];
  onClose: () => void;
  onUnarchiveProject: (key: string) => void;
  onUnarchiveSession: (id: string) => void;
  onOpenSession: (session: SessionInfo) => void;
  onDeleteSession: (id: string) => void;
}

function sessionTitle(session: SessionInfo): string {
  const first = skillExpansionToCommand(session.firstMessage) ?? session.firstMessage;
  return session.name || first.slice(0, 60) || session.id.slice(0, 12);
}

export function ArchiveDialog({
  projects,
  sessions,
  onClose,
  onUnarchiveProject,
  onUnarchiveSession,
  onOpenSession,
  onDeleteSession,
}: Props) {
  const { locale, t } = useI18n();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => setPortalTarget(document.body), []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") onClose();
  }, [onClose]);

  if (!portalTarget) return null;

  const empty = projects.length === 0 && sessions.length === 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("sidebar.archived")}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          width: 560, maxWidth: "calc(100vw - 24px)",
          height: "min(640px, calc(100dvh - 24px))", maxHeight: "calc(100dvh - 24px)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: "var(--bg)", border: "1px solid var(--border)",
          borderRadius: 12, boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{t("sidebar.archived")}</div>
          <button
            type="button"
            onClick={onClose}
            title={t("i18n.close")}
            aria-label={t("i18n.close")}
            style={{ padding: "2px 6px", border: 0, background: "none", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 10px 14px" }}>
          {empty && (
            <div style={{ padding: "28px 12px", textAlign: "center", color: "var(--text-dim)", fontSize: 12 }}>
              {t("archive.empty")}
            </div>
          )}

          {projects.length > 0 && (
            <>
              <div style={{ padding: "10px 8px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                {t("sidebar.projects")}
              </div>
              {projects.map((project) => (
                <div
                  key={project.key}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 7 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--text-dim)" strokeWidth="1.3" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M1.5 3h4l1.5 2h7.5v7.5h-13z" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "var(--text)" }}>{project.name}</div>
                    <div title={project.root} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      {project.root}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 11, color: "var(--text-dim)" }}>{project.count}</span>
                  <button
                    type="button"
                    onClick={() => onUnarchiveProject(project.key)}
                    style={{ flexShrink: 0, padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-hover)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}
                  >
                    {t("sidebar.unarchiveProject")}
                  </button>
                </div>
              ))}
            </>
          )}

          {sessions.length > 0 && (
            <>
              <div style={{ padding: "14px 8px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                {t("archive.conversations")}
              </div>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenSession(session)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenSession(session); } }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 7, cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div title={sessionTitle(session)} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: "var(--text)" }}>
                      {sessionTitle(session)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{formatRelativeTime(session.modified, locale)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUnarchiveSession(session.id); }}
                    style={{ flexShrink: 0, padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-hover)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}
                  >
                    {t("sidebar.unarchiveSession")}
                  </button>
                  <button
                    type="button"
                    title={t("sidebar.deleteWithShiftClick")}
                    aria-label={t("sidebar.delete")}
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 26, height: 26, padding: 0, border: "none", background: "none", color: "var(--text-dim)", cursor: "pointer", borderRadius: 6 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-dim)"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
