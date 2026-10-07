// The stored flag changed meaning with the layout: it used to say "the sidebar
// section is open" (default true), now it says "the editor's tree column is
// expanded" (default false). A fresh key keeps the old always-on preference
// from overriding the new, folded-by-default intent.
const EXPLORER_OPEN_STORAGE_KEY = "pi-web:file-explorer:expanded";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadExplorerOpen(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(EXPLORER_OPEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveExplorerOpen(
  open: boolean,
  storage: StorageLike | null = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(EXPLORER_OPEN_STORAGE_KEY, String(open));
  } catch {
    // Persistence is best-effort; privacy mode and storage quotas must not break the explorer.
  }
}
