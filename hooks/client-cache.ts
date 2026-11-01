"use client";

// In-memory cache shared across component instances within the same page
// session (cleared on full page reload). Lets a hook seed its initial state
// from the last successful fetch instead of blanking to empty/loading on
// every remount — e.g. navigating to a details page and back to the
// dashboard shows the last known data instantly while it silently
// revalidates, rather than flashing skeletons every time.
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}
