import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");

test("压缩后的会话仍可根据持久化消息数生成标题", () => {
  assert.match(
    source,
    /\(sessionStats\?\.userMessages \?\? 0\) > 0 \|\| selectedSession\.messageCount > 0/,
  );
});

test("尚未落盘的会话不会触发依赖 JSONL 的自动命名", () => {
  assert.match(
    source,
    /const disabled = !selectedSession \|\| selectedSession\.transient \|\| !hasMessages/,
  );
});

test("会话落盘后会用服务端记录清除临时状态", () => {
  assert.match(source, /\{ \.\.\.prev, \.\.\.full, transient: full\.transient \?\? false \}/);
  assert.match(source, /if \(selectedSession\) hydrateSelectedSession\(selectedSession\.id\)/);
});

test("新会话会在首条消息后自动命名，且只针对本次新建的会话", () => {
  assert.match(source, /freshSessionIdsRef\.current\.add\(session\.id\)/);
  assert.match(source, /if \(!eligible\) return;/);
  assert.match(source, /void requestAutoName\(session\.id, \{ silent: true \}\)/);
  assert.match(source, /const eligible = shouldAutoNameSession\(/);
});
