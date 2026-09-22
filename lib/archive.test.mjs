import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  clearArchivedProject,
  readArchive,
  setArchived,
  writeArchive,
} = await jiti.import("./archive.ts");

function tempArchive(t) {
  const dir = mkdtempSync(join(tmpdir(), "pi-web-archive-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, "archive.json");
}

test("missing or malformed archive files read as empty", (t) => {
  const archivePath = tempArchive(t);
  assert.deepEqual(readArchive(archivePath), { projects: [], sessions: [] });
  writeFileSync(archivePath, "{not json");
  assert.deepEqual(readArchive(archivePath), { projects: [], sessions: [] });
});

test("archiving a project and a session is independent and reversible", (t) => {
  const archivePath = tempArchive(t);
  setArchived("project", "/work/app", true, archivePath);
  setArchived("session", "s1", true, archivePath);
  assert.deepEqual(readArchive(archivePath), { projects: ["/work/app"], sessions: ["s1"] });

  setArchived("project", "/work/app", false, archivePath);
  assert.deepEqual(readArchive(archivePath), { projects: [], sessions: ["s1"] });
});

test("setArchived deduplicates repeated entries", (t) => {
  const archivePath = tempArchive(t);
  setArchived("session", "s1", true, archivePath);
  setArchived("session", "s1", true, archivePath);
  assert.deepEqual(readArchive(archivePath).sessions, ["s1"]);
});

test("writeArchive drops malformed values", (t) => {
  const archivePath = tempArchive(t);
  writeArchive({ projects: ["/a", "/a", 42, ""], sessions: [null, "s1"] }, archivePath);
  assert.deepEqual(readArchive(archivePath), { projects: ["/a"], sessions: ["s1"] });
});

test("clearArchivedProject removes the project key but keeps session entries", (t) => {
  const archivePath = tempArchive(t);
  setArchived("project", "/a", true, archivePath);
  setArchived("project", "/b", true, archivePath);
  setArchived("session", "s1", true, archivePath);
  const next = clearArchivedProject("/a", archivePath);
  assert.deepEqual(next, { projects: ["/b"], sessions: ["s1"] });
});
