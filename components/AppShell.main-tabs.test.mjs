import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./AppShell.tsx", import.meta.url), "utf8");

/** The main editor area: pinned chat tab + one tab per open file. */
function mainEditorBlock() {
  const start = source.indexOf("{/* Main editor tabs");
  const end = source.indexOf("{/* Right panel content", start);
  assert.notEqual(start, -1, "main editor comment not found");
  assert.notEqual(end, -1, "end of main editor block not found");
  return source.slice(start, end);
}

test("the main editor area keeps a pinned chat tab next to the open files", () => {
  assert.match(
    source,
    /const mainTabs: Tab\[\] = \[\s*\{\s*id: CHAT_TAB_ID,\s*label: translate\("chat\.tab"\),\s*filePath: "",\s*kind: "chat",\s*closable: false,?\s*\},\s*\.\.\.fileTabs,\s*\];/,
  );
  const block = mainEditorBlock();
  assert.match(block, /\{fileTabs\.length > 0 && \(/);
  assert.match(block, /<TabBar[\s\S]*?tabs=\{mainTabs\}[\s\S]*?activeTabId=\{activeContentTabId\}[\s\S]*?onSelectTab=\{setActiveContentTabId\}/);
});

test("the conversation stays mounted while a file tab is in front", () => {
  const block = mainEditorBlock();
  // Chat is rendered whenever a session exists — hiding it must not unmount it,
  // otherwise streaming, drafts and scroll position would be lost.
  assert.match(block, /\{showChat \? \(\s*<div[\s\S]*?<ChatWindow/);
  assert.match(block, /visibility: fileTabActive \? "hidden" : "visible"/);
  assert.doesNotMatch(block, /fileTabActive \? null : \(/);
});

test("opening a file switches the middle tab instead of revealing the right panel", () => {
  const start = source.indexOf("  const handleOpenFile = useCallback");
  const end = source.indexOf("  const handleOpenLinkedFile = useCallback", start);
  const body = source.slice(start, end);
  assert.match(body, /setActiveContentTabId\(tabId\);/);
  assert.doesNotMatch(body, /setRightPanelOpen\(true\)/);
});

test("the right panel hosts the changes list and terminals, never file viewers", () => {
  const start = source.indexOf("{/* Right panel: changes list");
  const end = source.indexOf("{/* Right panel content", start);
  assert.notEqual(start, -1, "right panel comment not found");
  const header = source.slice(start, end);
  assert.match(header, /aria-pressed=\{rightPanelTabId === CHANGES_TAB_ID\}/);
  assert.match(header, /tabs=\{rightPanelTabs\}/);
  const start2 = source.indexOf("{/* Right panel content");
  const end2 = source.indexOf("</div>\n      </div>", start2);
  const body = source.slice(start2, end2);
  assert.match(body, /rightPanelTabId === CHANGES_TAB_ID \? \(/);
  assert.doesNotMatch(body, /<FileViewer/);
  assert.doesNotMatch(body, /activeFileTab/);

  // File tabs are simply not part of the right panel any more.
  assert.match(source, /const rightPanelTabs: Tab\[\] = terminalTabs\.map\(/);
  assert.doesNotMatch(source, /panelTabs/);
});

test("the toolbar explorer button reveals the sidebar file tree", () => {
  assert.match(
    source,
    /const handleExplorerToggle = useCallback\(\(\) => \{[\s\S]*?if \(!sidebarOpen\) \{\s*setSidebarOpen\(true\);\s*handleExplorerOpenChange\(true\);\s*return;\s*\}\s*handleExplorerOpenChange\(!explorerOpen\);/,
  );
  assert.match(source, /\{renderExplorerToggle\(\)\}/);
  assert.match(source, /explorerOpen=\{explorerOpen\}\s*\n\s*onExplorerOpenChange=\{handleExplorerOpenChange\}/);
  assert.match(source, /const label = active \? translate\("files\.hideExplorer"\) : translate\("files\.showExplorer"\);/);
});

test("switching projects returns the middle area to the conversation", () => {
  const resets = source.match(/setActiveContentTabId\(CHAT_TAB_ID\);/g) ?? [];
  assert.equal(resets.length, 2, "both project-switch paths must reset the active tab");
  // Closing the last file tab falls back to chat as well.
  assert.match(source, /const remaining = fileTabs\.filter\(\(t\) => t\.id !== tabId\);\s*return remaining\.at\(-1\)\?\.id \?\? CHAT_TAB_ID;/);
});
