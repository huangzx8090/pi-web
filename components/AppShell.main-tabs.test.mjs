import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./AppShell.tsx", import.meta.url), "utf8");

/** The editor area: optional tree column + pinned chat tab + one tab per file. */
function mainEditorBlock() {
  const start = source.indexOf("{/* Editor area: an optional file-tree column");
  const end = source.indexOf("{/* Right panel content", start);
  assert.notEqual(start, -1, "editor area comment not found");
  assert.notEqual(end, -1, "end of editor area block not found");
  return source.slice(start, end);
}

test("the main editor area keeps a pinned chat tab next to the open files", () => {
  const start = source.indexOf("  const mainTabs: Tab[] = [");
  const end = source.indexOf("  const rightPanelTabs: Tab[]", start);
  assert.notEqual(start, -1, "mainTabs declaration not found");
  const tabs = source.slice(start, end);
  assert.match(tabs, /id: CHAT_TAB_ID, label: translate\("chat\.tab"\), filePath: "", kind: "chat", closable: false \},/);
  assert.match(tabs, /\.\.\.fileTabs,/);
  // The file tree is a column of the editor area, not a tab in this strip.
  assert.doesNotMatch(tabs, /EXPLORER/);

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

test("the toolbar explorer button shows and hides the editor's tree column", () => {
  assert.match(
    source,
    /const handleExplorerToggle = useCallback\(\(\) => \{\s*handleExplorerOpenChange\(!explorerOpen\);\s*\}, \[explorerOpen, handleExplorerOpenChange\]\);/,
  );
  // The tree column lives beside the conversation now, so the toggle must not
  // drag the sidebar along with it.
  const start = source.indexOf("const handleExplorerToggle");
  const block = source.slice(start, source.indexOf("}, [explorerOpen, handleExplorerOpenChange]);", start));
  assert.doesNotMatch(block, /setSidebarOpen/);
  assert.match(source, /\{renderExplorerToggle\(isMobile\)\}/);
  assert.match(source, /const label = active \? translate\("files\.hideExplorer"\) : translate\("files\.showExplorer"\);/);
});

test("the sidebar toggle keeps addressing the sidebar it opens", () => {
  // The explorer button used to carry this hook; now that it points at the tree
  // column, the sidebar toggle has to declare what it controls itself.
  const start = source.indexOf("onClick={handleSidebarToggle}");
  const button = source.slice(start, source.indexOf("</button>", start));
  assert.match(button, /aria-controls="session-sidebar"/);
  assert.match(button, /aria-expanded=\{sidebarOpen\}/);
  assert.match(source, /aria-controls=\{EXPLORER_PANE_ID\}/);
});

test("the tree is a resizable column inside the editor area, not a full-width view", () => {
  const block = mainEditorBlock();
  assert.match(block, /\{showExplorerColumn && \(/);
  assert.match(block, /id=\{EXPLORER_PANE_ID\}/);
  assert.match(block, /"--explorer-column-width": `\$\{explorerColumnResizer\.width\}px`/);
  assert.match(block, /width: "var\(--explorer-column-width\)"/);
  assert.match(block, /<FileExplorerPane[\s\S]*?cwd=\{explorerCwd!\}[\s\S]*?onOpenFile=\{handleOpenFile\}[\s\S]*?onRefresh=\{handleExplorerRefresh\}/);
  // A drag handle between the column and the content, and the phone fallback.
  assert.match(block, /data-resize-handle="explorer-column"/);
  assert.match(block, /data-explorer-layout=\{explorerColumnIsOverlay \? "overlay" : "column"\}/);
  assert.match(source, /const explorerColumnIsOverlay = isMobile && showExplorerColumn;/);
  assert.match(source, /const showExplorerColumn = explorerOpen && Boolean\(explorerCwd\);/);
  assert.match(source, /import \{ FileExplorerPane \} from "\.\/FileExplorerPane";/);

  const sidebarStart = source.indexOf("<SessionSidebar");
  const sidebar = source.slice(sidebarStart, source.indexOf("onSessionsChange={handleSessionsChange}", sidebarStart));
  assert.doesNotMatch(sidebar, /explorerOpen=/);
  assert.doesNotMatch(sidebar, /onExplorerOpenChange=/);
  assert.doesNotMatch(sidebar, /onOpenFile=/);
  assert.doesNotMatch(sidebar, /onOpenTerminal=/);
});

test("the tree column reserves room for the conversation", () => {
  const start = source.indexOf("  const explorerColumnResizer = useResizablePanel({");
  const end = source.indexOf("  });", start);
  assert.notEqual(start, -1, "explorer column resizer not found");
  const resizer = source.slice(start, end);
  assert.match(resizer, /getMaxWidth: getResponsiveExplorerColumnMaxWidth/);
  assert.match(resizer, /storageKey: "pi-explorer-column-width"/);
  assert.match(resizer, /growthDirection: "right"/);
  assert.match(source, /getExplorerColumnMaxWidth\(\{[\s\S]*?rightPanelWidth: rightPanelWidthRef\.current,/);
  // The right panel eats editor width, so widening it re-clamps the column.
  assert.match(source, /reclampExplorerColumnWidth\(\);\s*\}, \[reclampExplorerColumnWidth, reclampRightPanelWidth, reclampSidebarWidth, rightPanelOpen\]\);/);
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
