"use client";

import { useSyncExternalStore } from "react";

/*
 * The reader's clock as an external store: null during server render and
 * hydration, the real time once the browser takes over, re-read every minute.
 * Anything that compares a deadline to "now" for display goes through this,
 * because the server's clock and timezone are not the reader's.
 */
function subscribe(callback: () => void) {
  const timer = setInterval(callback, 60_000);
  return () => clearInterval(timer);
}

let cachedMinute = 0;
let cachedNow: Date | null = null;

function getNow(): Date {
  const minute = Math.floor(Date.now() / 60_000);
  if (minute !== cachedMinute || !cachedNow) {
    cachedMinute = minute;
    cachedNow = new Date();
  }
  return cachedNow;
}

export function useNow(): Date | null {
  return useSyncExternalStore(subscribe, getNow, () => null);
}
