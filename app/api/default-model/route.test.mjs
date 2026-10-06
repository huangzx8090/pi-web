import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import { createJiti } from "jiti";

const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
const testAgentDir = await mkdtemp(join(tmpdir(), "pi-web-default-model-route-"));
process.env.PI_CODING_AGENT_DIR = testAgentDir;

const jiti = createJiti(import.meta.url, {
  alias: { "@": process.cwd() },
  interopDefault: true,
  moduleCache: false,
});
const { GET, PUT } = await jiti.import("./route.ts");

const settingsPath = join(testAgentDir, "settings.json");

after(async () => {
  if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
  await rm(testAgentDir, { recursive: true, force: true });
});

function request(body, contentType = "application/json", host = "localhost") {
  return new Request("http://localhost/api/default-model", {
    method: "PUT",
    headers: { "Content-Type": contentType, Host: host },
    body: JSON.stringify(body),
  });
}

test("sets, reads, and clears the global default model", async () => {
  let response = await PUT(request({ provider: "deepseek", modelId: "deepseek-chat" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    defaultModel: { provider: "deepseek", modelId: "deepseek-chat" },
  });
  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {
    defaultProvider: "deepseek",
    defaultModel: "deepseek-chat",
  });

  response = await GET();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).defaultModel, {
    provider: "deepseek",
    modelId: "deepseek-chat",
  });

  response = await PUT(request({ provider: null, modelId: null }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { defaultModel: null });
  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {});
});

test("preserves unrelated settings when writing the default", async () => {
  await writeFile(settingsPath, JSON.stringify({ theme: "dark" }));
  await PUT(request({ provider: "openai", modelId: "gpt-5" }));
  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {
    theme: "dark",
    defaultProvider: "openai",
    defaultModel: "gpt-5",
  });
});

test("validates the default model request", async () => {
  let response = await PUT(request({ provider: "openai" }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /provider and modelId/);

  response = await PUT(request({ provider: "", modelId: "gpt-5" }));
  assert.equal(response.status, 400);

  response = await PUT(request({ provider: "openai", modelId: "gpt-5" }, "text/plain"));
  assert.equal(response.status, 415);

  response = await PUT(request({ provider: "openai", modelId: "gpt-5" }, "application/json", "evil.example"));
  assert.equal(response.status, 403);
});
