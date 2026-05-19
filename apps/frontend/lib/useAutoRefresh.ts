"use client";

import { useEffect, useRef } from "react";

export function useAutoRefresh(
  callback: () => Promise<void> | void,
  intervalMs: number,
  enabled = true,
) {
  const callbackRef = useRef(callback);
  const runningRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (runningRef.current) {
        return;
      }

      runningRef.current = true;
      try {
        Promise.resolve(callbackRef.current()).finally(() => {
          runningRef.current = false;
        });
      } catch (error) {
        runningRef.current = false;
        throw error;
      }
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [enabled, intervalMs]);
}
