"use client";

import { useEffect, useState } from "react";

/** Current time for render code, refreshed every minute (keeps components pure, and "due in" labels fresh). */
export const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};
