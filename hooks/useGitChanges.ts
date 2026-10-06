"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GitStatusResponse } from "@/lib/git-types";

interface Options {
  /** Directory to inspect. Nothing is fetched while this is empty. */
  cwd?: string | null;
  /** Bump to force an immediate refetch (e.g. when a turn ends). */
  refreshKey?: number;
  /** Poll while true. Off means "no requests at all". */
  active: boolean;
  pollIntervalMs?: number;
}

interface Result {
  status: GitStatusResponse | null;
  loading: boolean;
  error: string | null;
  /**
   * Increments only when the working tree actually changed. Children use it as
   * a cache key so an unchanged poll cycle costs no extra requests.
   */
  revision: number;
  refresh: () => void;
}

/**
 * Track the working tree of `cwd` over time.
 *
 * Polling is gated by `active` so an idle session costs nothing, and results
 * are compared by signature so an unchanged tree never re-renders consumers.
 */
export function useGitChanges({
  cwd,
  refreshKey,
  active,
  pollIntervalMs = 2000,
}: Options): Result {
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [manualKey, setManualKey] = useState(0);
  const requestIdRef = useRef(0);
  const signatureRef = useRef("");

  const load = useCallback(async () => {
    if (!cwd) {
      signatureRef.current = "";
      setStatus(null);
      setError(null);
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/git/status?${new URLSearchParams({ cwd }).toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as GitStatusResponse;
      if (requestId !== requestIdRef.current) return;
      const signature = JSON.stringify(data);
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setStatus(data);
        setRevision((value) => value + 1);
      }
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [cwd]);

  // Initial load, plus refetch whenever the caller bumps its keys.
  useEffect(() => {
    if (!active) {
      requestIdRef.current++;
      return;
    }
    void load();
  }, [active, load, refreshKey, manualKey]);

  useEffect(() => {
    if (!active || pollIntervalMs <= 0) return;
    const id = setInterval(() => void load(), pollIntervalMs);
    return () => clearInterval(id);
  }, [active, load, pollIntervalMs]);

  const refresh = useCallback(() => setManualKey((value) => value + 1), []);

  return { status, loading, error, revision, refresh };
}
