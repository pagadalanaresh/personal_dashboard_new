import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, options?: Intl.NumberFormatOptions) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(Math.abs(value) / 100)
  return `${value >= 0 ? "+" : "-"}${formatted}`
}

export function formatPlainPercent(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-IN", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  }).format(value / 100)
}

export function formatSignedCurrency(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`
}

export function formatCurrencyUSD(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

export function formatCompactCurrencyUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatSignedCurrencyUSD(value: number) {
  return `${value >= 0 ? "+" : "-"}${formatCurrencyUSD(Math.abs(value))}`
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-IN", options).format(value)
}

export function displaySymbol(symbol: string) {
  return symbol.replace(/\.NS$/i, "")
}

export function stockHref(symbol: string) {
  return `/stocks/${encodeURIComponent(symbol)}`
}

export function indexHref(symbol: string) {
  return `/indexes/${encodeURIComponent(symbol)}`
}

// Table sort comparator: nulls (e.g. a trend score still loading, or a
// target/buy price that was never set) always sort last, regardless of
// direction — the caller flips the whole result for descending order.
export function compareNullableValues(a: string | number | null, b: string | number | null) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b)
  return (a as number) - (b as number)
}
