/**
 * Helpers for the macOS native file chooser (choose file), the wallpaper
 * counterpart of lib/apple-folder-dialog.ts.
 *
 * The prompt is interpolated into an AppleScript string literal, so quotes and
 * backslashes must be stripped — otherwise a translated prompt could break out
 * of the literal and run arbitrary AppleScript on the host.
 */

const DEFAULT_PROMPT = "Choose a picture";
const MAX_PROMPT_LENGTH = 120;

export function sanitizeFilePrompt(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_PROMPT;
  const cleaned = value
    .replace(/["\\\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PROMPT_LENGTH);
  return cleaned || DEFAULT_PROMPT;
}

/**
 * AppleScript that opens a Finder file chooser limited to common image types
 * and prints the POSIX path of the chosen file.
 */
export function buildChooseFileScript(prompt: unknown): string {
  return `POSIX path of (choose file with prompt "${sanitizeFilePrompt(prompt)}" of type {"public.image"} without multiple selections allowed)`;
}

/** `POSIX path of` yields a trailing slash on directories; files come clean. */
export function parsePickedFilePath(stdout: string): string {
  return stdout.trim().replace(/^"|"$/g, "");
}

/** macOS reports a dismissed dialog as `User canceled. (-128)`. */
export function isFileUserCanceled(message: string): boolean {
  return /User canceled|-128/i.test(message);
}
