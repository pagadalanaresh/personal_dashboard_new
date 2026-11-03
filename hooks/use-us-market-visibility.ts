"use client";

import * as React from "react";

const STORAGE_KEY = "wealthfolio:showUSMarket";
const CHANGE_EVENT = "wealthfolio:us-market-visibility-changed";

function readStoredVisibility() {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

// localStorage-backed, matching this app's other persisted preferences
// (refresh interval, theme) — hidden by default since this app is
// primarily for tracking NSE holdings.
export function useUSMarketVisibility() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readStoredVisibility());
    function onChange() {
      setVisible(readStoredVisibility());
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const updateVisible = React.useCallback((next: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [visible, updateVisible] as const;
}
