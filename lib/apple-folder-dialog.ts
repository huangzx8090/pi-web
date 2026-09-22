/**
 * Helpers for the macOS native folder chooser.
 *
 * The prompt is interpolated into an AppleScript string literal, so quotes and
 * backslashes must be stripped — otherwise a translated prompt could break out
 * of the literal and run arbitrary AppleScript on the host.
 */

const DEFAULT_PROMPT = "Select project folder";
const MAX_PROMPT_LENGTH = 120;

export function sanitizeFolderPrompt(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_PROMPT;
  const cleaned = value
    .replace(/["\\\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PROMPT_LENGTH);
  return cleaned || DEFAULT_PROMPT;
}

/** AppleScript that opens the Finder folder chooser and prints the path. */
export function buildChooseFolderScript(prompt: unknown): string {
  return `POSIX path of (choose folder with prompt "${sanitizeFolderPrompt(prompt)}")`;
}

/** `POSIX path of` yields a trailing slash (`/Users/me/`); drop it for the cwd. */
export function parsePickedPath(stdout: string): string {
  const trimmed = stdout.trim().replace(/\/+$/, "");
  return trimmed || "/";
}

/** macOS reports a dismissed dialog as `User canceled. (-128)`. */
export function isUserCanceled(message: string): boolean {
  return /User canceled|-128/i.test(message);
}
