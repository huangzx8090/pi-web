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
    assistantMessages: 1,
    ...overrides,
  };
}

const ready = {
  isFresh: true,
  alreadyHandled: false,
  hasPendingTimer: false,
  sessionRunning: false,
};

test("names a fresh session once its first reply exists", () => {
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

test("waits for the first reply instead of naming the opening prompt", () => {
  assert.equal(shouldAutoNameSession(candidate({ assistantMessages: 0 }), ready), false);
});

test("waits for the turn to finish so the transcript holds a complete reply", () => {
  assert.equal(shouldAutoNameSession(candidate(), { ...ready, sessionRunning: true }), false);
});

test("treats a whitespace-only name as unnamed", () => {
  assert.equal(shouldAutoNameSession(candidate({ name: "   " }), ready), true);
});
