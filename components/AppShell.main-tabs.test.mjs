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

test("the main editor area keeps pinned chat and tree tabs ahead of the open files", () => {
  const start = source.indexOf("  const mainTabs: Tab[] = [");
  const end = source.indexOf("  const rightPanelTabs: Tab[]", start);
  assert.notEqual(start, -1, "mainTabs declaration not found");
  const tabs = source.slice(start, end);
  // Pinned views are declared in a fixed order so they never shift when files
  // open and close; transient file tabs come last.
  assert.match(tabs, /id: CHAT_TAB_ID, label: translate\("chat\.tab"\), filePath: "", kind: "chat", closable: false \},/);
  assert.match(tabs, /id: EXPLORER_TAB_ID, label: translate\("files\.explorer"\), filePath: "", kind: "explorer" as const, closable: false \}/);
  assert.ok(tabs.indexOf("CHAT_TAB_ID") < tabs.indexOf("EXPLORER_TAB_ID"));
  assert.ok(tabs.indexOf("EXPLORER_TAB_ID") < tabs.indexOf("...fileTabs"));
  assert.match(tabs, /\.\.\.\(explorerOpen/);

  const block = mainEditorBlock();
  // The strip is up whenever there is a second view to switch to.
  assert.match(block, /\{mainTabs\.length > 1 && \(/);
  assert.match(block, /<TabBar[\s\S]*?tabs=\{mainTabs\}[\s\S]*?activeTabId=\{activeContentTabId\}[\s\S]*?onSelectTab=\{setActiveContentTabId\}/);
});

test("the conversation stays mounted while a file tab or the tree is in front", () => {
  const block = mainEditorBlock();
  // Chat is rendered whenever a session exists — hiding it must not unmount it,
  // otherwise streaming, drafts and scroll position would be lost.
  assert.match(block, /\{showChat \? \(\s*<div[\s\S]*?<ChatWindow/);
  assert.match(block, /visibility: fileTabActive \|\| explorerTabActive \? "hidden" : "visible"/);
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

test("the toolbar explorer toggle moves the editor area onto the file tree", () => {
  assert.match(
    source,
    /const handleExplorerToggle = useCallback\(\(\) => \{[\s\S]*?if \(explorerOpen && activeContentTabId === EXPLORER_TAB_ID\) \{\s*handleExplorerOpenChange\(false\);[\s\S]*?setActiveContentTabId\(\(current\) => \(current === EXPLORER_TAB_ID \? CHAT_TAB_ID : current\)\);\s*return;\s*\}\s*handleExplorerOpenChange\(true\);\s*setActiveContentTabId\(EXPLORER_TAB_ID\);/,
  );
  // Leaving the tree falls back to the conversation, never to an empty area.
  const start = source.indexOf("const handleExplorerToggle");
  const block = source.slice(start, source.indexOf("}, [explorerOpen, activeContentTabId, handleExplorerOpenChange]);", start));
  assert.doesNotMatch(block, /setSidebarOpen/);
  assert.match(source, /\{renderExplorerToggle\(isMobile\)\}/);
  assert.match(source, /const label = active \? translate\("files\.hideExplorer"\) : translate\("files\.showExplorer"\);/);
});

test("the sidebar toggle keeps addressing the sidebar it opens", () => {
  // The explorer button used to carry this hook; now that it points at the tree
  // pane, the sidebar toggle has to declare what it controls itself.
  const start = source.indexOf("onClick={handleSidebarToggle}");
  const button = source.slice(start, source.indexOf("</button>", start));
  assert.match(button, /aria-controls="session-sidebar"/);
  assert.match(button, /aria-expanded=\{sidebarOpen\}/);
  assert.match(source, /aria-controls=\{EXPLORER_PANE_ID\}/);
});

test("the tree renders inside the editor area, not in the sidebar", () => {
  const block = mainEditorBlock();
  assert.match(block, /\{explorerTabActive && explorerCwd \? \(/);
  assert.match(block, /id=\{EXPLORER_PANE_ID\}/);
  assert.match(block, /<FileExplorerPane[\s\S]*?cwd=\{explorerCwd\}[\s\S]*?onOpenFile=\{handleOpenFile\}[\s\S]*?onRefresh=\{handleExplorerRefresh\}/);
  assert.match(source, /import \{ FileExplorerPane \} from "\.\/FileExplorerPane";/);
  // The tree only takes over when there is a workspace to list.
  assert.match(source, /const explorerTabActive = explorerOpen && Boolean\(explorerCwd\) && activeContentTabId === EXPLORER_TAB_ID;/);

  const sidebarStart = source.indexOf("<SessionSidebar");
  const sidebar = source.slice(sidebarStart, source.indexOf("onSessionsChange={handleSessionsChange}", sidebarStart));
  assert.doesNotMatch(sidebar, /explorerOpen=/);
  assert.doesNotMatch(sidebar, /onExplorerOpenChange=/);
  assert.doesNotMatch(sidebar, /onOpenFile=/);
  assert.doesNotMatch(sidebar, /onOpenTerminal=/);
});

test("the explorer entry is a labelled toolbar button like its neighbours", () => {
  const start = source.indexOf("const renderExplorerToggle = (mobile: boolean) => {");
  const end = source.indexOf("\n  };", start);
  assert.notEqual(start, -1, "explorer toggle renderer not found");
  const block = source.slice(start, end);
  // Same shape as the history / system / tools buttons: full-height, bordered
  // label with a 12px icon, and an accent top border while active.
  assert.match(block, /height: "100%", padding: mobile \? 0 : "0 12px"/);
  assert.match(block, /borderTop: active \? "2px solid var\(--accent\)" : "2px solid transparent"/);
  assert.match(block, /<svg width="12" height="12"/);
  assert.match(block, /\{!mobile && <span>\{translate\("files\.explorer"\)\}<\/span>\}/);
  assert.match(block, /data-mobile-toolbar-explorer=\{mobile \? "true" : undefined\}/);
});

test("switching projects returns the middle area to the conversation", () => {
  const resets = source.match(/setActiveContentTabId\(CHAT_TAB_ID\);/g) ?? [];
  assert.equal(resets.length, 2, "both project-switch paths must reset the active tab");
  // Closing the last file tab falls back to chat as well.
  assert.match(source, /const remaining = fileTabs\.filter\(\(t\) => t\.id !== tabId\);\s*return remaining\.at\(-1\)\?\.id \?\? CHAT_TAB_ID;/);
});
