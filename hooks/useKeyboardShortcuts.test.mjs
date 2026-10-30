import assert from "node:assert/strict";
import test from "node:test";
import { isNewSessionShortcut } from "./useKeyboardShortcuts.ts";

function shortcut({ key = "n", code = "KeyN", ctrlKey = true, altKey = true } = {}) {
  return isNewSessionShortcut({ key, code, ctrlKey, altKey });
}

test("Ctrl+Alt+N starts a new session", () => {
  assert.equal(shortcut(), true);
  // Caps Lock and Shift still deliver the letter; code is unchanged.
  assert.equal(shortcut({ key: "N" }), true);
  assert.equal(shortcut({ key: "N", code: "KeyN" }), true);
});

test("macOS reports a dead key for Option+N, so the physical key decides", () => {
  // Option+N is `˜` in the U.S., ABC and British layouts. Chrome sends
  // key="Dead" with the modifiers intact, which the old key-only match missed.
  assert.equal(shortcut({ key: "Dead" }), true);
});

test("a character Ctrl+Alt types is the user's text, not the shortcut", () => {
  // Windows reports AltGr as Ctrl+Alt: Polish AltGr+N types `\u0144`, Czech `}`.
  assert.equal(shortcut({ key: "\u0144" }), false);
  assert.equal(shortcut({ key: "}" }), false);
  // Dvorak's physical N is `b`; its `n` (KeyL) still matches by the letter.
  assert.equal(shortcut({ key: "b" }), false);
  assert.equal(shortcut({ key: "n", code: "KeyL" }), true);
});

test("the shortcut needs both Ctrl and Alt", () => {
  assert.equal(shortcut({ ctrlKey: false }), false);
  assert.equal(shortcut({ altKey: false }), false);
  assert.equal(shortcut({ ctrlKey: false, altKey: false }), false);
});

test("another key with Ctrl and Alt is not the shortcut", () => {
  assert.equal(shortcut({ key: "m", code: "KeyM" }), false);
  assert.equal(shortcut({ key: "Dead", code: "KeyM" }), false);
});

test("a KeyboardEvent without a code still matches by key", () => {
  // Older Safari and events built by hand carry no `code`.
  assert.equal(isNewSessionShortcut({ key: "n", code: null, ctrlKey: true, altKey: true }), true);
  assert.equal(isNewSessionShortcut({ key: "Dead", code: null, ctrlKey: true, altKey: true }), false);
  assert.equal(shortcut({ key: "n", code: "" }), true);
  assert.equal(shortcut({ key: "Dead", code: "" }), false);
});
