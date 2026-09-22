import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { shouldAutoNameSession } = await jiti.import("./auto-name.ts");

function candidate(overrides = {}) {
  return {
    id: "s1",
    name: undefined,
    transient: false,
    relationKind: null,
    messageCount: 1,
    userMessages: 1,
    ...overrides,
  };
}

const ready = { isFresh: true, alreadyHandled: false, hasPendingTimer: false };

test("names a fresh session once its first user message exists", () => {
  assert.equal(shouldAutoNameSession(candidate(), ready), true);
});

test("does not spend title tokens on sessions merely opened this load", () => {
  assert.equal(shouldAutoNameSession(candidate(), { ...ready, isFresh: false }), false);
});

test("skips sessions that are already named, handled, or pending", () => {
  assert.equal(shouldAutoNameSession(candidate({ name: "Existing" }), ready), false);
  assert.equal(shouldAutoNameSession(candidate(), { ...ready, alreadyHandled: true }), false);
  assert.equal(shouldAutoNameSession(candidate(), { ...ready, hasPendingTimer: true }), false);
});

test("never names transient placeholders or subagent rows", () => {
  assert.equal(shouldAutoNameSession(candidate({ transient: true }), ready), false);
  assert.equal(shouldAutoNameSession(candidate({ relationKind: "subagent" }), ready), false);
});

test("waits until there is a user message to summarize", () => {
  assert.equal(shouldAutoNameSession(candidate({ messageCount: 0, userMessages: 0 }), ready), false);
  assert.equal(shouldAutoNameSession(candidate({ messageCount: 4, userMessages: 0 }), ready), true);
  assert.equal(shouldAutoNameSession(candidate({ messageCount: 0, userMessages: 2 }), ready), true);
});

test("treats a whitespace-only name as unnamed", () => {
  assert.equal(shouldAutoNameSession(candidate({ name: "   " }), ready), true);
});
