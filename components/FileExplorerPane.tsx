"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FileExplorer, type FileExplorerHandle } from "./FileExplorer";
import { useI18n } from "@/hooks/useI18n";
import { getFileName } from "@/lib/file-paths";

/**
 * The file tree as a panel of the main editor area (it used to live at the
 * bottom of the sidebar). Everything it needs is local state: the tree's own
 * refresh counter, upload busy flag, change count badge and in-tree search.
 */
interface Props {
  cwd: string;
  onOpenFile: (
    filePath: string,
    fileName: string,
    options?: { sourceSessionId?: string | null; modeHint?: "diff" },
  ) => void;
  onOpenTerminal?: (cwd: string) => void;
  onAtMention?: (relativePath: string, isDir: boolean) => void;
  onAtMentions?: (relativePaths: string[]) => void;
  /** Bumped by the shell to force a re-list (also refreshes git status). */
  refreshKey?: number;
  /** Shell handler for the refresh button; falls back to a local re-list. */
  onRefresh?: () => void;
}

function ToolbarIconButton({
  onClick,
  title,
  disabled,
  skipHover,
  color,
  background = "none",
  marginRight,
  ariaPressed,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  skipHover?: boolean;
  color: string;
  background?: string;
  marginRight?: number;
  ariaPressed?: boolean;
  children: ReactNode;
}) {
  const enter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || skipHover) return;
    e.currentTarget.style.color = "var(--text-muted)";
    e.currentTarget.style.background = "var(--bg-hover)";
  };
  const leave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || skipHover) return;
    e.currentTarget.style.color = color;
    e.currentTarget.style.background = background;
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={ariaPressed}
      style={{
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, padding: 0, marginRight,
        background,
        border: "none",
        color,
        cursor: disabled ? "default" : "pointer",
        borderRadius: 5,
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
        transition: "color 0.3s, background 0.3s",
      }}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      {children}
    </button>
  );
}

export function FileExplorerPane({
  cwd,
  onOpenFile,
  onOpenTerminal,
  onAtMention,
  onAtMentions,
  refreshKey,
  onRefresh,
}: Props) {
  const { t } = useI18n();
  const [localKey, setLocalKey] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [changesCount, setChangesCount] = useState(0);
  const [changesCollapsed, setChangesCollapsed] = useState(true);
  const [fileSearchOpen, setFileSearchOpen] = useState(false);
  const [refreshDone, setRefreshDone] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const explorerRef = useRef<FileExplorerHandle>(null);

  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const handleRefresh = useCallback(() => {
    if (onRefresh) onRefresh();
    else setLocalKey((k) => k + 1);
    setRefreshDone(true);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setRefreshDone(false), 2000);
  }, [onRefresh]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
      }}>
        {/* The tab already says "file explorer", so the header only needs to say
            which workspace is being listed — plus the tree's own actions. */}
        <div
          title={cwd}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "6px 10px",
            color: "var(--text-dim)",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getFileName(cwd) || cwd}
        </div>
        {onOpenTerminal && (
          <ToolbarIconButton
            onClick={() => onOpenTerminal(cwd)}
            title={t("terminal.open")}
            color="var(--text-dim)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </ToolbarIconButton>
        )}
        {changesCount > 0 && (
          <ToolbarIconButton
            onClick={() => setChangesCollapsed((v) => !v)}
            title={t("sidebar.changedFiles", { count: changesCount })}
            ariaPressed={!changesCollapsed}
            color={changesCollapsed ? "var(--text-dim)" : "var(--accent)"}
            background={changesCollapsed ? "none" : "var(--bg-selected)"}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M3 12h6" />
              <path d="M15 12h6" />
            </svg>
          </ToolbarIconButton>
        )}
        <ToolbarIconButton
          onClick={() => setFileSearchOpen((open) => !open)}
          title={t("sidebar.searchFiles")}
          ariaPressed={fileSearchOpen}
          color={fileSearchOpen ? "var(--accent)" : "var(--text-dim)"}
          background={fileSearchOpen ? "var(--bg-selected)" : "none"}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
          </svg>
        </ToolbarIconButton>
        <ToolbarIconButton
          onClick={() => explorerRef.current?.openUploadPicker()}
          disabled={uploadBusy}
          title={t("sidebar.uploadFilesTitle")}
          color="var(--text-dim)"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m17 8-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </ToolbarIconButton>
        <ToolbarIconButton
          onClick={handleRefresh}
          title={t("sidebar.refreshExplorer")}
          skipHover={refreshDone}
          color={refreshDone ? "#4ade80" : "var(--text-dim)"}
          background={refreshDone ? "rgba(74,222,128,0.18)" : "none"}
          marginRight={6}
        >
          {refreshDone ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          )}
        </ToolbarIconButton>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
        <FileExplorer
          ref={explorerRef}
          cwd={cwd}
          onOpenFile={onOpenFile}
          refreshKey={refreshKey ?? localKey}
          onAtMention={onAtMention}
          onAtMentions={onAtMentions}
          onUploadBusyChange={setUploadBusy}
          changesCollapsed={changesCollapsed}
          onChangesCountChange={setChangesCount}
          fileSearchOpen={fileSearchOpen}
          onFileSearchOpenChange={setFileSearchOpen}
        />
      </div>
    </div>
  );
}
