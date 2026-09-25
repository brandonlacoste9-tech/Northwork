"use client";

import { useEffect, useState } from "react";

const LOAD_DELAY_MS = 700;

export function useDirectoryStatus() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const shouldError =
      new URLSearchParams(window.location.search).get("error") === "1";
    const timer = window.setTimeout(() => {
      setStatus(shouldError ? "error" : "ready");
    }, LOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [attempt]);

  function retry() {
    const url = new URL(window.location.href);
    if (url.searchParams.get("error") === "1") {
      url.searchParams.delete("error");
      const next = `${url.pathname}${url.search}`;
      window.history.replaceState(null, "", next);
    }
    setStatus("loading");
    setAttempt((current) => current + 1);
  }

  return { status, retry };
}
