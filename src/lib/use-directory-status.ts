"use client";

import { useEffect, useState } from "react";

const LOAD_DELAY_MS = 700;

/**
 * Directories render immediately. `?error=1` still previews the retry state.
 */
export function useDirectoryStatus() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("ready");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const shouldError =
      new URLSearchParams(window.location.search).get("error") === "1";
    if (!shouldError) return;
    const timer = window.setTimeout(() => setStatus("error"), LOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [attempt]);

  function retry() {
    const url = new URL(window.location.href);
    if (url.searchParams.get("error") === "1") {
      url.searchParams.delete("error");
      const next = `${url.pathname}${url.search}`;
      window.history.replaceState(null, "", next);
    }
    setStatus("ready");
    setAttempt((current) => current + 1);
  }

  return { status, retry };
}
