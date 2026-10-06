/**
 * Title text rules, kept dependency-free on purpose: the sidebar renders titles
 * too, and importing `session-title.ts` would drag the model SDK into the
 * client bundle just to clip a string.
 *
 * Sidebar budget. A title is read in a ~260px column, so the prompt asks for
 * something short and the parser enforces it. CJK titles are counted in
 * characters (about a dozen fit); space-separated ones get more characters but
 * still only a handful of words.
 */
export const TITLE_CJK_LIMIT = 16;
export const TITLE_LATIN_LIMIT = 32;

/** Characters that read as a natural break when a title has to be clipped. */
const TITLE_BREAK = /[\s\u3000，、；：·—|/,;:]/;
const CJK_CHAR = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;

function cjkRatio(value: string): number {
  const characters = Array.from(value);
  if (characters.length === 0) return 0;
  let cjk = 0;
  for (const character of characters) if (CJK_CHAR.test(character)) cjk += 1;
  return cjk / characters.length;
}

/**
 * Clip a title to what the sidebar can actually show.
 *
 * CJK titles are counted per character — only about a dozen fit in the column —
 * while space-separated ones get a larger budget. A break character near the end
 * wins so the result still reads as a phrase instead of a severed word; when
 * there is no usable break the cut lands on the limit.
 */
export function trimSessionTitle(value: string): string {
  const characters = Array.from(value.trim());
  const limit = cjkRatio(value) >= 0.3 ? TITLE_CJK_LIMIT : TITLE_LATIN_LIMIT;
  if (characters.length <= limit) return characters.join("");

  const head = characters.slice(0, limit);
  let breakAt = -1;
  for (let i = head.length - 1; i >= 0; i--) {
    if (TITLE_BREAK.test(head[i])) { breakAt = i; break; }
  }
  // Only honour a break that keeps most of the budget: a comma one third of the
  // way in would throw the rest of the title away.
  const clipped = breakAt >= Math.floor(limit * 0.6) ? head.slice(0, breakAt) : head;
  return clipped.join("").replace(/[\s\u3000，、；：·—|/,;:]+$/u, "").trim();
}

/**
 * Sidebar title for a session nobody has named yet: its opening line, clipped
 * the same way a generated title would be. Falls back to the session id when
 * the session has no text at all.
 */
export function firstMessageTitle(firstMessage: string | undefined, sessionId: string): string {
  const text = (firstMessage ?? "").replace(/\s+/g, " ").trim();
  return trimSessionTitle(text) || sessionId.slice(0, 12);
}
