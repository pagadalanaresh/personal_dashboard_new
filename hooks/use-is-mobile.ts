"use client";

import * as React from "react";

const MOBILE_QUERY = "(max-width: 767px)";

// Matches the app's `md` breakpoint (768px) — the same cutoff used
// throughout for mobile-only nav/layout (bottom tab bar, large titles).
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with window.matchMedia on mount
    setIsMobile(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
