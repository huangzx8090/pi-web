import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const {
  TITLE_CJK_LIMIT,
  TITLE_LATIN_LIMIT,
  firstMessageTitle,
  trimSessionTitle,
} = await createJiti(import.meta.url).import("./title-text.ts");

test("keeps a title that already fits the sidebar", () => {
  assert.equal(trimSessionTitle("修复登录重定向"), "修复登录重定向");
  assert.equal(trimSessionTitle("Fix the login redirect"), "Fix the login redirect");
  assert.equal(trimSessionTitle("  修掉标题过长  "), "修掉标题过长");
});

test("counts CJK titles by character, not by the Latin budget", () => {
  const clipped = trimSessionTitle("修".repeat(TITLE_CJK_LIMIT + 8));
  assert.equal([...clipped].length, TITLE_CJK_LIMIT);

  // Lazily applying the Latin budget to CJK text is what made titles wrap.
  assert.ok([...trimSessionTitle("这是一个很长的中文标题需要被缩短一些才行")].length <= TITLE_CJK_LIMIT);
});

test("gives space-separated titles the wider budget", () => {
  const clipped = trimSessionTitle("Implement session title generation from a transcript");
  assert.equal(clipped, "Implement session title");
  assert.ok([...clipped].length > TITLE_CJK_LIMIT);
  assert.ok([...clipped].length <= TITLE_LATIN_LIMIT);
});

test("prefers a break character over a severed word", () => {
  assert.equal(
    trimSessionTitle("Refactor the session title generation pipeline"),
    "Refactor the session title",
  );
});

test("breaks CJK titles on punctuation instead of mid-phrase", () => {
  const clipped = trimSessionTitle(`修${"改".repeat(13)}，这里有更多的说明文字`);
  assert.equal(clipped, `修${"改".repeat(13)}`);
});

test("ignores a break that would throw most of the budget away", () => {
  // A colon 4 characters in is not a usable break, so the cut lands on the limit.
  const clipped = trimSessionTitle("Fix: supercalifragilisticexpialidociousxyz");
  assert.equal([...clipped].length, TITLE_LATIN_LIMIT);
  assert.match(clipped, /^Fix: superc/);
});

test("never leaves a dangling separator at the cut", () => {
  assert.equal(trimSessionTitle(`${"字".repeat(TITLE_CJK_LIMIT)}，`), "字".repeat(TITLE_CJK_LIMIT));
  assert.doesNotMatch(
    trimSessionTitle("Fix the parser bug, then rerun everything"),
    /[\s,;:|]+$/,
  );
});

test("falls back to the session id when there is no text yet", () => {
  assert.equal(firstMessageTitle(undefined, "01a10bc6e2da7121"), "01a10bc6e2da");
  assert.equal(firstMessageTitle("   ", "01a10bc6e2da7121"), "01a10bc6e2da");
});

test("collapses whitespace so a multi-line opening prompt stays one line", () => {
  assert.equal(firstMessageTitle("帮我\n\n把标题  缩短一点", "s1"), "帮我 把标题 缩短一点");
});

test("clips a long opening prompt exactly like a generated title", () => {
  const prompt = "帮我看看为什么这个会话的标题总是特别长，长到侧边栏里显示不下只能截断";
  const title = firstMessageTitle(prompt, "s1");
  assert.equal(title, trimSessionTitle(prompt));
  assert.ok([...title].length <= TITLE_CJK_LIMIT);
});
