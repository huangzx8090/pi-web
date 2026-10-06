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
  /** Assistant turns counted from the live session state. */
  assistantMessages: number;
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
    /** The session is mid-turn right now. */
    sessionRunning: boolean;
  },
): boolean {
  if (!options.isFresh || options.alreadyHandled || options.hasPendingTimer) return false;
  if (session.transient) return false;
  if (session.relationKind === "subagent") return false;
  if (session.name && session.name.trim().length > 0) return false;
  // Name the session once its first reply has landed, not on the first prompt.
  // A prompt alone states the goal and nothing else, which is what made early
  // titles vague and long-winded; with the reply in the transcript the model
  // also sees what the work turned out to be. Waiting for the turn to finish
  // keeps a half-streamed answer out of that transcript.
  if (options.sessionRunning) return false;
  return session.assistantMessages > 0;
}
