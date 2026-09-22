import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, tsconfigPaths: true });
const { projectNameFromPath } = await jiti.import("./CreateProjectDialog.tsx");

test("derives the default project name from the final path segment", () => {
  assert.equal(projectNameFromPath("/Users/me/projects/my-app"), "my-app");
  assert.equal(projectNameFromPath("/Users/me/projects/my-app/"), "my-app");
  assert.equal(projectNameFromPath("C:\\Users\\me\\我的项目"), "我的项目");
  assert.equal(projectNameFromPath("C:\\Users\\me\\我的项目\\"), "我的项目");
  assert.equal(projectNameFromPath("my-app"), "my-app");
  assert.equal(projectNameFromPath("/"), "");
});
