import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  clampPanelWidth,
  EXPLORER_COLUMN_MAX_WIDTH,
  getDefaultRightPanelWidth,
  getExplorerColumnMaxWidth,
  getRightPanelMaxWidth,
  getSidebarMaxWidth,
} = await jiti.import("./panel-layout.ts");

test("clamps panel widths to finite bounds", () => {
  assert.equal(clampPanelWidth(420.4, 180, 480), 420);
  assert.equal(clampPanelWidth(120, 180, 480), 180);
  assert.equal(clampPanelWidth(600, 180, 480), 480);
  assert.equal(clampPanelWidth(Number.NaN, 180, 480), 180);
  assert.equal(clampPanelWidth(200, 300, 250), 300);
});

test("keeps the responsive right panel default within useful limits", () => {
  assert.equal(getDefaultRightPanelWidth(700), 360);
  assert.equal(getDefaultRightPanelWidth(1366), 574);
  assert.equal(getDefaultRightPanelWidth(1920), 640);
});

test("reserves chat space while split panels are visible", () => {
  assert.equal(getSidebarMaxWidth({
    viewportWidth: 700,
    rightPanelOpen: true,
    rightPanelWidth: 560,
  }), 380);
  assert.equal(getSidebarMaxWidth({
    viewportWidth: 1366,
    rightPanelOpen: true,
    rightPanelWidth: 686,
  }), 260);
  assert.equal(getRightPanelMaxWidth({
    viewportWidth: 1024,
    sidebarOpen: true,
    sidebarWidth: 260,
  }), 344);
  assert.equal(getRightPanelMaxWidth({
    viewportWidth: 1366,
    sidebarOpen: true,
    sidebarWidth: 260,
  }), 686);
});

test("does not rewrite desktop widths while the file panel is in overlay mode", () => {
  assert.equal(getRightPanelMaxWidth({
    viewportWidth: 900,
    sidebarOpen: true,
    sidebarWidth: 480,
  }), 1200);
});

test("the file-tree column gives way to the chat, the sidebar and the right panel", () => {
  const base = { sidebarOpen: false, sidebarWidth: 260, rightPanelOpen: false, rightPanelWidth: 560 };
  // A wide window with nothing else open gets the column's own maximum.
  assert.equal(getExplorerColumnMaxWidth({ ...base, viewportWidth: 1512 }), EXPLORER_COLUMN_MAX_WIDTH);
  // Sidebar (260) + right panel (560) + a 420px conversation leave 272px.
  assert.equal(getExplorerColumnMaxWidth({
    ...base,
    viewportWidth: 1512,
    sidebarOpen: true,
    rightPanelOpen: true,
  }), 272);
  assert.equal(getExplorerColumnMaxWidth({
    ...base,
    viewportWidth: 1024,
    sidebarOpen: true,
  }), 344);
  // Below the split breakpoint the right panel overlays the editor area, so it
  // must not take width away from the column.
  assert.equal(getExplorerColumnMaxWidth({
    ...base,
    viewportWidth: 900,
    rightPanelOpen: true,
  }), EXPLORER_COLUMN_MAX_WIDTH);
  // Phones get the plain maximum: the column is drawn as an overlay there.
  assert.equal(getExplorerColumnMaxWidth({
    ...base,
    viewportWidth: 640,
    sidebarOpen: true,
  }), EXPLORER_COLUMN_MAX_WIDTH);
});
