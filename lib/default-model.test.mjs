import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const {
  readDefaultModel,
  writeDefaultModel,
} = await createJiti(import.meta.url).import("./default-model.ts");

async function createSettingsPath(name) {
  const root = await mkdtemp(join(tmpdir(), `pi-web-default-model-${name}-`));
  return join(root, "settings.json");
}

test("reads no default model when the settings file is missing", async () => {
  const settingsPath = await createSettingsPath("missing");
  assert.equal(readDefaultModel(settingsPath), null);
});

test("writes the default model and preserves unrelated settings", async () => {
  const settingsPath = await createSettingsPath("write");
  await writeFile(settingsPath, JSON.stringify({ theme: "dark", unrelated: { keep: true } }));

  const saved = await writeDefaultModel({ provider: "deepseek", modelId: "deepseek-chat" }, settingsPath);

  assert.deepEqual(saved, { provider: "deepseek", modelId: "deepseek-chat" });
  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {
    theme: "dark",
    unrelated: { keep: true },
    defaultProvider: "deepseek",
    defaultModel: "deepseek-chat",
  });
  assert.deepEqual(readDefaultModel(settingsPath), { provider: "deepseek", modelId: "deepseek-chat" });
});

test("clears the default model without dropping other settings", async () => {
  const settingsPath = await createSettingsPath("clear");
  await writeFile(settingsPath, JSON.stringify({
    defaultProvider: "anthropic",
    defaultModel: "claude-sonnet-4-6",
    defaultThinkingLevel: "high",
  }));

  const saved = await writeDefaultModel(null, settingsPath);

  assert.equal(saved, null);
  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {
    defaultThinkingLevel: "high",
  });
});

test("creates the settings file when it does not exist", async () => {
  const settingsPath = await createSettingsPath("create");
  await writeDefaultModel({ provider: "openai", modelId: "gpt-5" }, settingsPath);

  assert.equal(await readFile(settingsPath, "utf8"), `${JSON.stringify({
    defaultProvider: "openai",
    defaultModel: "gpt-5",
  }, null, 2)}\n`);
});

test("rejects a malformed settings file instead of overwriting it", async () => {
  const settingsPath = await createSettingsPath("malformed");
  const original = JSON.stringify(["not", "an", "object"]);
  await writeFile(settingsPath, original);

  assert.throws(() => readDefaultModel(settingsPath), /expected an object/);
  await assert.rejects(
    writeDefaultModel({ provider: "openai", modelId: "gpt-5" }, settingsPath),
    /expected an object/,
  );
  assert.equal(await readFile(settingsPath, "utf8"), original);
});
