"use client";

import * as React from "react";
import {
  formatCurrency,
  formatCurrencyUSD,
  formatCompactCurrency,
  formatCompactCurrencyUSD,
  formatSignedCurrency,
  formatSignedCurrencyUSD,
} from "@/lib/utils";
import { getCached, setCached } from "@/hooks/client-cache";
import { useUSMarketVisibility } from "@/hooks/use-us-market-visibility";

export type MarketScope = "NSE" | "US";
export type CurrencyScope = "INR" | "USD";

const MARKET_STORAGE_KEY = "wealthfolio:market";
const FX_CACHE_KEY = "fx-rate:USDINR";
const FX_STALE_AFTER_MS = 5 * 60 * 1000;

type CachedFxRate = { rate: number; fetchedAt: number };

type MarketContextValue = {
  market: MarketScope;
  setMarket: (market: MarketScope) => void;
  // The currency a holding/transaction is actually denominated in, given
  // the active market — NOT necessarily what's on screen (see below).
  nativeCurrency: CurrencyScope;
  // What's actually rendered. Defaults to nativeCurrency, but the small
  // INR/USD toggle on Dashboard/Portfolio/Closed Positions can override it
  // to show a live-FX-converted equivalent instead.
  displayCurrency: CurrencyScope;
  setDisplayCurrency: (currency: CurrencyScope) => void;
  fxRate: number | null;
  format: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatSigned: (value: number) => string;
  formatCompact: (value: number) => string;
};

const MarketContext = React.createContext<MarketContextValue | null>(null);

function convert(value: number, from: CurrencyScope, to: CurrencyScope, rate: number | null) {
  if (from === to || rate == null) return value;
  return from === "INR" ? value / rate : value * rate;
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarketState] = React.useState<MarketScope>("NSE");
  const [currencyOverride, setCurrencyOverride] = React.useState<CurrencyScope | null>(null);
  const [fxRate, setFxRate] = React.useState<number | null>(
    () => getCached<CachedFxRate>(FX_CACHE_KEY)?.rate ?? null
  );
  const [showUS] = useUSMarketVisibility();

  React.useEffect(() => {
    const stored = window.localStorage.getItem(MARKET_STORAGE_KEY);
    if (stored === "NSE" || stored === "US") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarketState(stored);
    }
  }, []);

  // US stocks are hidden by default in Settings — if that's ever turned
  // off while US is the active market (including on load, from a stale
  // stored choice), fall back to NSE rather than leaving an unreachable
  // market selected with no switcher to get back out of it.
  React.useEffect(() => {
    if (!showUS && market === "US") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarketState("NSE");
    }
  }, [showUS, market]);

  // Shared across the whole app — fetched once (or once per 5-min staleness
  // window) regardless of how many components read `fxRate`.
  React.useEffect(() => {
    const cached = getCached<CachedFxRate>(FX_CACHE_KEY);
    if (cached && Date.now() - cached.fetchedAt < FX_STALE_AFTER_MS) return;
    let cancelled = false;
    fetch("/api/market-data/fx-rate?pair=USDINR", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || typeof data.rate !== "number") return;
        setFxRate(data.rate);
        setCached<CachedFxRate>(FX_CACHE_KEY, { rate: data.rate, fetchedAt: Date.now() });
      })
      .catch(() => {
        // FX rate is a nice-to-have for currency conversion display — never
        // let a flaky network turn it into an uncaught error.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMarket = React.useCallback((next: MarketScope) => {
    setMarketState(next);
    window.localStorage.setItem(MARKET_STORAGE_KEY, next);
    // A currency choice made for one market's holdings has no meaning for
    // the other market's — reset to that market's native currency.
    setCurrencyOverride(null);
  }, []);

  const nativeCurrency: CurrencyScope = market === "US" ? "USD" : "INR";
  const displayCurrency = currencyOverride ?? nativeCurrency;

  const setDisplayCurrency = React.useCallback((next: CurrencyScope) => {
    setCurrencyOverride(next);
  }, []);

  const format = React.useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      const converted = convert(value, nativeCurrency, displayCurrency, fxRate);
      return displayCurrency === "USD"
        ? formatCurrencyUSD(converted, options)
        : formatCurrency(converted, options);
    },
    [nativeCurrency, displayCurrency, fxRate]
  );

  const formatSigned = React.useCallback(
    (value: number) => {
      const converted = convert(value, nativeCurrency, displayCurrency, fxRate);
      return displayCurrency === "USD"
        ? formatSignedCurrencyUSD(converted)
        : formatSignedCurrency(converted);
    },
    [nativeCurrency, displayCurrency, fxRate]
  );

  const formatCompact = React.useCallback(
    (value: number) => {
      const converted = convert(value, nativeCurrency, displayCurrency, fxRate);
      return displayCurrency === "USD"
        ? formatCompactCurrencyUSD(converted)
        : formatCompactCurrency(converted);
    },
    [nativeCurrency, displayCurrency, fxRate]
  );

  const value = React.useMemo(
    () => ({
      market,
      setMarket,
      nativeCurrency,
      displayCurrency,
      setDisplayCurrency,
      fxRate,
      format,
      formatSigned,
      formatCompact,
    }),
    [market, setMarket, nativeCurrency, displayCurrency, setDisplayCurrency, fxRate, format, formatSigned, formatCompact]
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const context = React.useContext(MarketContext);
  if (!context) throw new Error("useMarket must be used within a MarketProvider");
  return context;
}
