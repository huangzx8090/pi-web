import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  buildChooseFolderScript,
  isUserCanceled,
  parsePickedPath,
  sanitizeFolderPrompt,
} = await jiti.import("./apple-folder-dialog.ts");

test("sanitizeFolderPrompt falls back when missing or blank", () => {
  assert.equal(sanitizeFolderPrompt(undefined), "Select project folder");
  assert.equal(sanitizeFolderPrompt(""), "Select project folder");
  assert.equal(sanitizeFolderPrompt("   "), "Select project folder");
  assert.equal(sanitizeFolderPrompt(42), "Select project folder");
});

test("sanitizeFolderPrompt strips AppleScript string delimiters and control chars", () => {
  const hostile = 'hello" & (do shell script "rm -rf ~") & "\\';
  const cleaned = sanitizeFolderPrompt(hostile);
  assert.ok(!cleaned.includes('"'));
  assert.ok(!cleaned.includes("\\"));
  assert.ok(cleaned.length > 0);
  assert.equal(sanitizeFolderPrompt("a\nb\tc"), "a b c");
});

test("sanitizeFolderPrompt caps the prompt length", () => {
  assert.equal(sanitizeFolderPrompt("x".repeat(500)).length, 120);
});

test("buildChooseFolderScript never lets a prompt break out of the literal", () => {
  const script = buildChooseFolderScript('bad" & (do shell script "id") & "');
  assert.equal((script.match(/"/g) ?? []).length, 2);
  assert.ok(script.startsWith("POSIX path of (choose folder with prompt \""));
  assert.ok(script.endsWith("\")"));
});

test("parsePickedPath drops the trailing slash Finder adds", () => {
  assert.equal(parsePickedPath("/Users/me/project/\n"), "/Users/me/project");
  assert.equal(parsePickedPath("/Users/me/project"), "/Users/me/project");
  assert.equal(parsePickedPath("/"), "/");
  assert.equal(parsePickedPath("   "), "/");
});

test("isUserCanceled recognizes the macOS dismissal signal", () => {
  assert.equal(isUserCanceled("execution error: User canceled. (-128)"), true);
  assert.equal(isUserCanceled("Command failed: ... -128"), true);
  assert.equal(isUserCanceled("osascript: command not found"), false);
});
