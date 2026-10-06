import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const {
  getPiWebSettingsPath,
  readTitleModel,
  writeTitleModel,
} = await createJiti(import.meta.url).import("./title-model.ts");

async function createSettingsPath(name) {
  const root = await mkdtemp(join(tmpdir(), `pi-web-title-model-${name}-`));
  return join(root, "settings.json");
}

test("keeps pi-web's own settings file, out of pi's settings.json", () => {
  assert.equal(getPiWebSettingsPath("/agent"), join("/agent", "pi-web", "settings.json"));
});

test("reads no title model when the settings file is missing", async () => {
  const settingsPath = await createSettingsPath("missing");
  assert.equal(readTitleModel(settingsPath), null);
});

test("writes the title model and preserves unrelated settings", async () => {
  const settingsPath = await createSettingsPath("write");
  await writeFile(settingsPath, JSON.stringify({ recentProjects: ["/tmp/x"] }));

  const saved = await writeTitleModel({ provider: "deepseek", modelId: "deepseek-chat" }, settingsPath);

  assert.deepEqual(saved, { provider: "deepseek", modelId: "deepseek-chat" });
  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {
    recentProjects: ["/tmp/x"],
    titleProvider: "deepseek",
    titleModel: "deepseek-chat",
  });
  assert.deepEqual(readTitleModel(settingsPath), { provider: "deepseek", modelId: "deepseek-chat" });
});

test("clears the title model without dropping other settings", async () => {
  const settingsPath = await createSettingsPath("clear");
  await writeFile(settingsPath, JSON.stringify({
    titleProvider: "anthropic",
    titleModel: "claude-haiku-4-5",
    unrelated: true,
  }));

  assert.equal(await writeTitleModel(null, settingsPath), null);
  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), { unrelated: true });
});

test("treats a half-written pair as unset", async () => {
  const settingsPath = await createSettingsPath("half");
  await writeFile(settingsPath, JSON.stringify({ titleProvider: "openai" }));
  assert.equal(readTitleModel(settingsPath), null);
});

test("creates the settings file when it does not exist", async () => {
  const settingsPath = await createSettingsPath("create");
  await writeTitleModel({ provider: "openai", modelId: "gpt-5-mini" }, settingsPath);

  assert.equal(await readFile(settingsPath, "utf8"), `${JSON.stringify({
    titleProvider: "openai",
    titleModel: "gpt-5-mini",
  }, null, 2)}\n`);
});

test("rejects a malformed settings file instead of overwriting it", async () => {
  const settingsPath = await createSettingsPath("malformed");
  const original = JSON.stringify("not an object");
  await writeFile(settingsPath, original);

  assert.throws(() => readTitleModel(settingsPath), /expected an object/);
  await assert.rejects(
    writeTitleModel({ provider: "openai", modelId: "gpt-5-mini" }, settingsPath),
    /expected an object/,
  );
  assert.equal(await readFile(settingsPath, "utf8"), original);
});
