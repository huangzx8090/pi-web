"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/hooks/useI18n";
import { pickNativeDirectory } from "@/lib/native-directory-picker";
import { DirectoryPicker } from "./DirectoryPicker";

export interface CreateProjectInput {
  name: string;
  cwd: string;
}

interface Props {
  busy?: boolean;
  error?: string | null;
  initialCwd?: string;
  /** Folder currently selected in the sidebar, used as a starting point. */
  initialPath?: string;
  onCancel: () => void;
  onCreate: (input: CreateProjectInput) => void;
}

/** Last path segment, tolerating both POSIX and Windows separators. */
export function projectNameFromPath(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const parts = trimmed.split(/[\\/]/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : trimmed;
}

export function CreateProjectDialog({ busy = false, error, initialCwd, initialPath, onCancel, onCreate }: Props) {
  const { t } = useI18n();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [name, setName] = useState(() => (initialCwd ? projectNameFromPath(initialCwd) : ""));
  const [cwd, setCwd] = useState(initialCwd ?? "");
  const [nameEdited, setNameEdited] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const handleSelectFolder = useCallback((path: string) => {
    setCwd(path);
    setPickerOpen(false);
    // Track the folder name until the user types their own project name.
    if (!nameEdited || !name.trim()) setName(projectNameFromPath(path));
  }, [nameEdited, name]);

  // Prefer the OS folder chooser; fall back to the in-app browser only when the
  // native picker is unavailable (non-macOS host, headless server, etc.).
  const handleAddFolder = useCallback(async () => {
    if (pickerBusy || busy) return;
    setPickerBusy(true);
    try {
      const result = await pickNativeDirectory(t("createProject.chooseFolderPrompt"));
      if (result.status === "picked") {
        handleSelectFolder(result.cwd);
        return;
      }
      if (result.status === "canceled") return;
      setPickerOpen(true);
    } finally {
      setPickerBusy(false);
    }
  }, [busy, handleSelectFolder, pickerBusy, t]);

  const folderLabel = useMemo(() => (cwd ? cwd : ""), [cwd]);
  const canCreate = Boolean(cwd) && !busy;

  if (!portalTarget) return null;

  const separator = <div style={{ height: 1, background: "var(--border)", margin: "4px 0 14px" }} />;

  return createPortal(
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("createProject.title")}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) onCancel();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy && !pickerOpen) onCancel();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            width: 560,
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "calc(100dvh - 24px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 8px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{t("createProject.title")}</div>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              title={t("i18n.close")}
              aria-label={t("i18n.close")}
              style={{ padding: "2px 6px", border: 0, background: "none", color: "var(--text-muted)", fontSize: 22, lineHeight: 1, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: "0 22px", overflowY: "auto" }}>
            {/* Project name */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, padding: "0 14px", height: 48, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-panel)" }}>
              <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="var(--text-dim)" strokeWidth="1.3" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M1.5 3h4l1.5 2h7.5v7.5h-13z" />
              </svg>
              <input
                type="text"
                value={name}
                autoFocus
                maxLength={120}
                placeholder={t("createProject.namePlaceholder")}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameEdited(true);
                }}
                style={{ flex: 1, minWidth: 0, height: "100%", border: 0, outline: "none", background: "transparent", color: "var(--text)", fontSize: 14 }}
              />
            </div>

            {separator}

            {/* Source folder */}
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{t("createProject.sourceFolder")}</div>
            <div
              onDragOver={(event) => event.preventDefault()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                minHeight: 132,
                padding: "18px 16px",
                border: `1px dashed ${cwd ? "rgba(37,99,235,0.5)" : "var(--border)"}`,
                borderRadius: 10,
                background: "var(--bg-panel)",
              }}
            >
              {cwd ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: "100%" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.3" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="M1.5 3h4l1.5 2h7.5v7.5h-13z" />
                    </svg>
                    <span
                      title={folderLabel}
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", direction: "rtl", textAlign: "left" }}
                    >
                      {folderLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddFolder()}
                    disabled={busy || pickerBusy}
                    style={{ padding: "6px 14px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg-hover)", color: "var(--text-muted)", fontSize: 12, cursor: busy || pickerBusy ? "default" : "pointer" }}
                  >
                    {pickerBusy ? t("i18n.checking") : t("createProject.changeFolder")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={busy || pickerBusy}
                    style={{ padding: 0, border: 0, background: "none", color: "var(--text-dim)", fontSize: 11, cursor: busy || pickerBusy ? "default" : "pointer", textDecoration: "underline" }}
                  >
                    {t("createProject.browseInApp")}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("createProject.addFolderHint")}</div>
                  <button
                    type="button"
                    onClick={() => void handleAddFolder()}
                    disabled={busy || pickerBusy}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-hover)", color: "var(--text)", fontSize: 13, fontWeight: 500, cursor: busy || pickerBusy ? "default" : "pointer" }}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                      <path d="M1.5 3h4l1.5 2h7.5v7.5h-13z" />
                    </svg>
                    {pickerBusy ? t("i18n.checking") : t("createProject.add")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={busy || pickerBusy}
                    style={{ padding: 0, border: 0, background: "none", color: "var(--text-dim)", fontSize: 11, cursor: busy || pickerBusy ? "default" : "pointer", textDecoration: "underline" }}
                  >
                    {t("createProject.browseInApp")}
                  </button>
                </>
              )}
            </div>

            {(error) && <div style={{ marginTop: 10, color: "#dc2626", fontSize: 12 }}>{error}</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, padding: "16px 22px 18px" }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{ padding: "9px 18px", border: 0, borderRadius: 8, background: "transparent", color: "var(--text-muted)", fontSize: 14, cursor: busy ? "default" : "pointer" }}
            >
              {t("i18n.cancel")}
            </button>
            <button
              type="button"
              onClick={() => onCreate({ name: name.trim(), cwd })}
              disabled={!canCreate}
              style={{
                padding: "9px 22px",
                border: 0,
                borderRadius: 8,
                background: canCreate ? "var(--text)" : "var(--bg-hover)",
                color: canCreate ? "var(--bg)" : "var(--text-dim)",
                fontSize: 14,
                fontWeight: 600,
                cursor: canCreate ? "pointer" : "default",
                opacity: canCreate ? 1 : 0.7,
              }}
            >
              {busy ? t("sidebar.creating") : t("createProject.create")}
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <DirectoryPicker
          initialPath={cwd || initialPath}
          onCancel={() => setPickerOpen(false)}
          onSelect={handleSelectFolder}
        />
      )}
    </>,
    portalTarget,
  );
}
