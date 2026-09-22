"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Small modal confirmation, styled to match ProjectTrustDialog. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busyLabel,
  busy = false,
  danger = false,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.4)",
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: 420,
          maxWidth: "100%",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--bg-panel)",
          boxShadow: "0 12px 36px rgba(0,0,0,0.24)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", gap: 12, padding: "18px 18px 14px" }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={danger ? "#ef4444" : "var(--text-muted)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</div>
            <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)" }}>{body}</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "10px 18px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              height: 32,
              padding: "0 12px",
              border: "1px solid var(--border)",
              borderRadius: 5,
              background: "transparent",
              color: "var(--text-muted)",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: 12,
            }}
          >
            {t("i18n.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              height: 32,
              padding: "0 12px",
              border: `1px solid ${danger ? "#ef4444" : "var(--accent)"}`,
              borderRadius: 5,
              background: danger ? "#ef4444" : "var(--accent)",
              color: danger ? "#fff" : "var(--accent-contrast)",
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
