/**
 * Eligibility for automatic session titling.
 *
 * Auto-naming is deliberately narrow: only a session the user actually started
 * in this page load is renamed, so merely browsing old unnamed sessions never
 * spends title tokens. Manual naming (the toolbar button) ignores these rules.
 */
export interface AutoNameCandidate {
  id: string;
  /** Existing user-defined or previously generated title. */
  name?: string | null;
  /** Client-side placeholder that has no JSONL file on disk yet. */
  transient?: boolean;
  /** "subagent" rows are never titled independently. */
  relationKind?: string | null;
  /** Messages persisted in the session file. */
  messageCount: number;
  /** User turns counted from the live session state. */
  userMessages: number;
}

export function shouldAutoNameSession(
  session: AutoNameCandidate,
  options: {
    /** Session was created in this page load (not just opened). */
    isFresh: boolean;
    /** A name request already succeeded or is in flight. */
    alreadyHandled: boolean;
    /** A debounce/retry timer is already scheduled for this session. */
    hasPendingTimer: boolean;
  },
): boolean {
  if (!options.isFresh || options.alreadyHandled || options.hasPendingTimer) return false;
  if (session.transient) return false;
  if (session.relationKind === "subagent") return false;
  if (session.name && session.name.trim().length > 0) return false;
  return session.userMessages > 0 || session.messageCount > 0;
}
