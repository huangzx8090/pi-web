import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  getProjectNames,
  readProjectRegistry,
  removeProject,
  renameProject,
  upsertProject,
} = await jiti.import("./project-registry.ts");

function tempRegistry(t) {
  const dir = mkdtempSync(join(tmpdir(), "pi-web-projects-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, "projects.json");
}

test("returns an empty registry when the file does not exist", (t) => {
  const registryPath = tempRegistry(t);
  assert.deepEqual(readProjectRegistry(registryPath), { projects: [] });
});

test("returns an empty registry for malformed JSON", (t) => {
  const registryPath = tempRegistry(t);
  writeFileSync(registryPath, "{not json");
  assert.deepEqual(readProjectRegistry(registryPath), { projects: [] });
});

test("upsert adds a project and preserves its creation time on re-upsert", (t) => {
  const registryPath = tempRegistry(t);
  const first = upsertProject({ key: "/work/app", root: "/work/app", name: "App" }, registryPath);
  assert.equal(first.project.name, "App");
  assert.equal(first.project.createdAt.length > 0, true);

  const second = upsertProject(
    { key: "/work/app", root: "/work/app", name: "Renamed", createdAt: "2000-01-01T00:00:00.000Z" },
    registryPath,
  );
  assert.equal(second.project.name, "Renamed");
  assert.equal(second.project.createdAt, first.project.createdAt);
  assert.equal(second.registry.projects.length, 1);
});

test("upsert without a name keeps an existing custom name", (t) => {
  const registryPath = tempRegistry(t);
  upsertProject({ key: "/work/app", root: "/work/app", name: "Keep me" }, registryPath);
  const { project } = upsertProject({ key: "/work/app", root: "/work/app" }, registryPath);
  assert.equal(project.name, "Keep me");
});

test("rename only touches the matching project", (t) => {
  const registryPath = tempRegistry(t);
  upsertProject({ key: "/a", root: "/a" }, registryPath);
  upsertProject({ key: "/b", root: "/b" }, registryPath);
  const registry = renameProject("/a", "Alpha", registryPath);
  assert.deepEqual(registry.projects.map((p) => p.name), ["Alpha", ""]);
  assert.equal(renameProject("/missing", "X", registryPath), null);
});

test("remove drops the entry and leaves the rest", (t) => {
  const registryPath = tempRegistry(t);
  upsertProject({ key: "/a", root: "/a" }, registryPath);
  upsertProject({ key: "/b", root: "/b" }, registryPath);
  const registry = removeProject("/a", registryPath);
  assert.deepEqual(registry.projects.map((p) => p.key), ["/b"]);
});

test("getProjectNames exposes only non-empty names", (t) => {
  const registryPath = tempRegistry(t);
  upsertProject({ key: "/a", root: "/a", name: "Alpha" }, registryPath);
  upsertProject({ key: "/b", root: "/b" }, registryPath);
  assert.deepEqual(getProjectNames(registryPath), { "/a": "Alpha" });
});

test("duplicate keys in the file are collapsed on read", (t) => {
  const registryPath = tempRegistry(t);
  writeFileSync(registryPath, JSON.stringify({
    projects: [
      { key: "/a", root: "/a", name: "First", createdAt: "2026-01-01T00:00:00.000Z" },
      { key: "/a", root: "/a", name: "Second", createdAt: "2026-01-02T00:00:00.000Z" },
    ],
  }));
  const registry = readProjectRegistry(registryPath);
  assert.equal(registry.projects.length, 1);
  assert.equal(registry.projects[0].name, "First");
});
