export const MOBILE_MAX_WIDTH = 640;
export const SPLIT_PANEL_MIN_WIDTH = 960;

export const SIDEBAR_DEFAULT_WIDTH = 260;
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 480;

export const RIGHT_PANEL_FALLBACK_WIDTH = 560;
export const RIGHT_PANEL_MIN_WIDTH = 300;
export const RIGHT_PANEL_MAX_WIDTH = 1200;

// The file tree is a column of the editor area, so it shares the space with the
// chat rather than with the sidebar — hence the tighter defaults.
export const EXPLORER_COLUMN_DEFAULT_WIDTH = 240;
export const EXPLORER_COLUMN_MIN_WIDTH = 180;
export const EXPLORER_COLUMN_MAX_WIDTH = 460;

const COMPACT_CHAT_MIN_WIDTH = 320;
const DESKTOP_CHAT_MIN_WIDTH = 420;

export function clampPanelWidth(width: number, minWidth: number, maxWidth: number): number {
  const finiteWidth = Number.isFinite(width) ? width : minWidth;
  const effectiveMax = Math.max(minWidth, maxWidth);
  return Math.round(Math.max(minWidth, Math.min(effectiveMax, finiteWidth)));
}

export function getDefaultRightPanelWidth(viewportWidth: number): number {
  return clampPanelWidth(viewportWidth * 0.42, 360, 640);
}

export function getSidebarMaxWidth(options: {
  viewportWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
}): number {
  const { viewportWidth, rightPanelOpen, rightPanelWidth } = options;
  if (viewportWidth <= MOBILE_MAX_WIDTH) return SIDEBAR_MAX_WIDTH;

  const compact = viewportWidth < SPLIT_PANEL_MIN_WIDTH;
  const chatWidth = compact ? COMPACT_CHAT_MIN_WIDTH : DESKTOP_CHAT_MIN_WIDTH;
  const visibleRightPanelWidth = !compact && rightPanelOpen ? rightPanelWidth : 0;
  return Math.min(SIDEBAR_MAX_WIDTH, viewportWidth - chatWidth - visibleRightPanelWidth);
}

export function getRightPanelMaxWidth(options: {
  viewportWidth: number;
  sidebarOpen: boolean;
  sidebarWidth: number;
}): number {
  const { viewportWidth, sidebarOpen, sidebarWidth } = options;
  if (viewportWidth < SPLIT_PANEL_MIN_WIDTH) return RIGHT_PANEL_MAX_WIDTH;

  const visibleSidebarWidth = sidebarOpen ? sidebarWidth : 0;
  return Math.min(
    RIGHT_PANEL_MAX_WIDTH,
    viewportWidth - DESKTOP_CHAT_MIN_WIDTH - visibleSidebarWidth,
  );
}

/** Max width of the file-tree column, leaving the conversation readable. */
export function getExplorerColumnMaxWidth(options: {
  viewportWidth: number;
  sidebarOpen: boolean;
  sidebarWidth: number;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
}): number {
  const { viewportWidth, sidebarOpen, sidebarWidth, rightPanelOpen, rightPanelWidth } = options;
  if (viewportWidth <= MOBILE_MAX_WIDTH) return EXPLORER_COLUMN_MAX_WIDTH;

  // Below the split breakpoint the right panel overlays the editor area, so it
  // does not take width away from the tree column.
  const compact = viewportWidth < SPLIT_PANEL_MIN_WIDTH;
  const chatWidth = compact ? COMPACT_CHAT_MIN_WIDTH : DESKTOP_CHAT_MIN_WIDTH;
  const visibleSidebarWidth = sidebarOpen ? sidebarWidth : 0;
  const visibleRightPanelWidth = !compact && rightPanelOpen ? rightPanelWidth : 0;
  return Math.min(
    EXPLORER_COLUMN_MAX_WIDTH,
    viewportWidth - chatWidth - visibleSidebarWidth - visibleRightPanelWidth,
  );
}
