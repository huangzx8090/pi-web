"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * The user's wallpaper choice, applied to <html> as CSS custom properties so
 * globals.css can paint it (html[data-wallpaper="on"]).
 *
 * The image itself lives on the server (~/.pi/agent/pi-web/wallpaper.<ext>,
 * served by /api/wallpaper); only the display settings are kept here.
 */
export interface WallpaperSettings {
  enabled: boolean;
  /** 0..1 — how strongly the panels let the picture through. */
  strength: number;
  /** 0..24 px — softens busy pictures so text stays readable. */
  blur: number;
  /** Bumped whenever a new picture is copied in, to bust the image cache. */
  version: number;
}

const STORAGE_KEY = "pi-wallpaper";
const DEFAULTS: WallpaperSettings = { enabled: false, strength: 0.55, blur: 0, version: 0 };

function readSettings(): WallpaperSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WallpaperSettings>;
    const strength = typeof parsed.strength === "number" ? Math.min(1, Math.max(0, parsed.strength)) : DEFAULTS.strength;
    const blur = typeof parsed.blur === "number" ? Math.min(24, Math.max(0, parsed.blur)) : DEFAULTS.blur;
    return {
      enabled: parsed.enabled === true,
      strength,
      blur,
      version: typeof parsed.version === "number" ? parsed.version : 0,
    };
  } catch {
    return DEFAULTS;
  }
}

const listeners = new Set<() => void>();
let snapshot: WallpaperSettings | null = null;

function getSnapshot(): WallpaperSettings {
  if (snapshot === null) snapshot = readSettings();
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  snapshot = null; // another tab may have chosen while nobody listened
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  snapshot = readSettings();
  listeners.forEach((cb) => cb());
}

function persist(next: WallpaperSettings): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Applies in memory even if the browser cannot save.
  }
  applyToDocument(next);
  listeners.forEach((cb) => cb());
}

function applyToDocument(settings: WallpaperSettings): void {
  const root = document.documentElement;
  if (!settings.enabled) {
    delete root.dataset.wallpaper;
    root.style.removeProperty("--wallpaper-image");
    root.style.removeProperty("--wallpaper-strength");
    root.style.removeProperty("--wallpaper-blur");
    return;
  }
  root.dataset.wallpaper = "on";
  root.style.setProperty("--wallpaper-image", `url("/api/wallpaper?v=${settings.version}")`);
  root.style.setProperty("--wallpaper-strength", String(settings.strength));
  root.style.setProperty("--wallpaper-blur", `${settings.blur}px`);
}

export function useWallpaper(): WallpaperSettings & {
  update: (patch: Partial<WallpaperSettings>) => void;
  clear: () => void;
} {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);

  const update = useCallback((patch: Partial<WallpaperSettings>) => {
    persist({ ...getSnapshot(), ...patch });
  }, []);

  const clear = useCallback(() => {
    void fetch("/api/wallpaper", { method: "DELETE" }).catch(() => {});
    persist({ ...DEFAULTS, version: getSnapshot().version + 1 });
  }, []);

  return { ...settings, update, clear };
}

/** Called once from the app shell to apply the saved choice on every load. */
export function useWallpaperBoot(): void {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULTS);
  const { enabled, strength, blur, version } = settings;
  useEffect(() => {
    applyToDocument({ enabled, strength, blur, version });
  }, [enabled, strength, blur, version]);
}
