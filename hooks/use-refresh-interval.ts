"use client";

import * as React from "react";

const STORAGE_KEY = "wealthfolio:refreshIntervalMinutes";
const CHANGE_EVENT = "wealthfolio:refresh-interval-changed";

export const DEFAULT_REFRESH_INTERVAL_MINUTES = 5;
export const REFRESH_INTERVAL_OPTIONS_MINUTES = [1, 5, 10, 15, 30] as const;

function readStoredInterval() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return REFRESH_INTERVAL_OPTIONS_MINUTES.includes(
    parsed as (typeof REFRESH_INTERVAL_OPTIONS_MINUTES)[number]
  )
    ? parsed
    : DEFAULT_REFRESH_INTERVAL_MINUTES;
}

// localStorage-backed, matching this app's only other persisted preference
// (next-themes' theme choice) — there's no per-user DB preferences table.
export function useRefreshInterval() {
  const [minutes, setMinutes] = React.useState(DEFAULT_REFRESH_INTERVAL_MINUTES);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinutes(readStoredInterval());
    function onChange() {
      setMinutes(readStoredInterval());
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const updateMinutes = React.useCallback((next: number) => {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [minutes, updateMinutes] as const;
}
