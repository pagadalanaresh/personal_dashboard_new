import "server-only";
import YahooFinance from "yahoo-finance2";

export type Quote = {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
};

export type HistoryPoint = {
  timestamp: number;
  value: number;
};

export type HistoryRange = "1D" | "1W" | "1M" | "1Y";

// Which exchange/market a symbol belongs to. Distinct from `NewsArticle`'s
// "IN" | "US" tag below (that one describes where a piece of *coverage* is
// from; this one describes which market a *holding/transaction* is in).
export type MarketScope = "NSE" | "US";

export type SymbolLookup = {
  symbol: string;
  name: string;
  price: number;
};

export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export type StockDetails = {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  currency: string;
};

export type NewsArticle = {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  market: "IN" | "US";
};

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]>;
  // Used to prepopulate the add-holding form from a ticker symbol.
  // Returns null when the symbol can't be resolved.
  lookupSymbol(symbol: string, market?: MarketScope): Promise<SymbolLookup | null>;
  // Company/symbol search, scoped to the given market's exchanges (NSE by default).
  searchSymbols(query: string, market?: MarketScope): Promise<SymbolSearchResult[]>;
  // Detail-screen data: quote + 52-week range. Returns null if unresolvable.
  getStockDetails(symbol: string, market?: MarketScope): Promise<StockDetails | null>;
  // Best-effort news for a symbol. Real providers may return an empty
  // array often — callers must handle "no news" as a normal, honest state.
  getNews(symbol: string, companyName: string, market?: MarketScope): Promise<NewsArticle[]>;
  // Sector per symbol, for allocation-by-sector views. Unresolvable
  // symbols map to "Other" rather than being dropped from the result.
  getSectors(symbols: string[], market?: MarketScope): Promise<Record<string, string>>;
}

// NSE (National Stock Exchange of India) symbols are suffixed `.NS` on
// Yahoo Finance. Search results already come back with the suffix; a
// symbol typed or pasted by hand might not, so normalize it here. Index
// symbols (e.g. `^NSEI`) are a distinct Yahoo Finance namespace and are
// never suffixed — passed through unchanged.
function toNseSymbol(symbol: string) {
  const upper = symbol.trim().toUpperCase();
  if (upper.startsWith("^") || upper.includes(".")) return upper;
  return `${upper}.NS`;
}

// US tickers (e.g. "AAPL") are used verbatim on Yahoo Finance — no suffix.
function normalizeSymbol(symbol: string, market: MarketScope = "NSE") {
  return market === "US" ? symbol.trim().toUpperCase() : toNseSymbol(symbol);
}

// Yahoo exchange codes for the major US equity venues (Nasdaq/NYSE/AMEX/ARCA).
const US_EQUITY_EXCHANGES = ["NMS", "NYQ", "NGM", "PCX", "ASE", "NCM"];

// Yahoo's news index also tags syndicated multi-company wire roundups
// (e.g. "Asian Equities Traded in the US as American Depositary
// Receipts...") with every ticker they happen to list — 9-16 unrelated
// tickers per article. These pass a naive relatedTickers check but aren't
// actually news about any one company, so they're filtered out separately:
// genuine company-specific coverage tags only a handful of tickers.
const MAX_RELATED_TICKERS_FOR_RELEVANCE = 6;
const GENERIC_NEWS_TITLE_PATTERNS = [/^Asian Equities Traded/i];

function isRelevantArticle(article: { title: string; relatedTickers?: string[] }) {
  if (GENERIC_NEWS_TITLE_PATTERNS.some((pattern) => pattern.test(article.title))) {
    return false;
  }
  return (article.relatedTickers?.length ?? 0) <= MAX_RELATED_TICKERS_FOR_RELEVANCE;
}

// Yahoo's news search is a fuzzy full-text index, not an exact-name lookup —
// searching the full legal entity name (e.g. "Prudent Corporate Advisory
// Services Limited") often returns zero results, while the same name with
// the trailing legal suffix stripped ("...Services") reliably surfaces the
// same articles. Verified empirically: this is the single biggest lever for
// small/mid-cap Indian names, which this unofficial search endpoint covers
// inconsistently to begin with.
function stripLegalSuffix(name: string): string {
  return name
    .replace(
      /\s+(private\s+limited|pvt\.?\s*ltd\.?|limited|ltd\.?|incorporated|inc\.?|corporation|corp\.?|plc|llc)\s*$/i,
      ""
    )
    .trim();
}

// Deterministic hash so a symbol always seeds the same pseudo-random walk
// within a session, instead of jumping around on every request.
function seedFromSymbol(symbol: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash << 5) - hash + symbol.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Base prices (INR) anchor the mock walk so common NSE tickers look
// plausible; unknown symbols fall back to a seeded synthetic base price.
const BASE_PRICES: Record<string, number> = {
  "RELIANCE.NS": 1310,
  "TCS.NS": 4155,
  "INFY.NS": 1875,
  "HDFCBANK.NS": 1745,
  "ICICIBANK.NS": 1295,
  "SBIN.NS": 830,
  "ITC.NS": 462,
  "HINDUNILVR.NS": 2510,
  "BAJFINANCE.NS": 7180,
  "LT.NS": 3610,
  "BHARTIARTL.NS": 1615,
  "KOTAKBANK.NS": 1790,
  "MARUTI.NS": 12480,
  "ASIANPAINT.NS": 2895,
  "WIPRO.NS": 288,
  "^NSEI": 24800,
  "^BSESN": 81200,
  "^NSEBANK": 55600,
  "^CNXIT": 31350,
  "^CNXPHARMA": 26450,
  "^CNXAUTO": 29200,
  "^CNXFMCG": 48600,
  "^CNXMETAL": 12950,
  "^CNXREALTY": 895,
  "^CNXENERGY": 38550,
};

// Fixed set of index quotes shown in the dashboard ticker.
export const MARKET_INDEXES = [
  { symbol: "^NSEI", name: "NIFTY 50" },
  { symbol: "^BSESN", name: "SENSEX" },
  { symbol: "^NSEBANK", name: "NIFTY BANK" },
  { symbol: "^CNXIT", name: "NIFTY IT" },
  { symbol: "^CNXPHARMA", name: "NIFTY PHARMA" },
  { symbol: "^CNXAUTO", name: "NIFTY AUTO" },
  { symbol: "^CNXFMCG", name: "NIFTY FMCG" },
  { symbol: "^CNXMETAL", name: "NIFTY METAL" },
  { symbol: "^CNXREALTY", name: "NIFTY REALTY" },
  { symbol: "^CNXENERGY", name: "NIFTY ENERGY" },
];

const SYMBOL_NAMES: Record<string, string> = {
  "RELIANCE.NS": "Reliance Industries Limited",
  "TCS.NS": "Tata Consultancy Services Limited",
  "INFY.NS": "Infosys Limited",
  "HDFCBANK.NS": "HDFC Bank Limited",
  "ICICIBANK.NS": "ICICI Bank Limited",
  "SBIN.NS": "State Bank of India",
  "ITC.NS": "ITC Limited",
  "HINDUNILVR.NS": "Hindustan Unilever Limited",
  "BAJFINANCE.NS": "Bajaj Finance Limited",
  "LT.NS": "Larsen & Toubro Limited",
  "BHARTIARTL.NS": "Bharti Airtel Limited",
  "KOTAKBANK.NS": "Kotak Mahindra Bank Limited",
  "MARUTI.NS": "Maruti Suzuki India Limited",
  "ASIANPAINT.NS": "Asian Paints Limited",
  "WIPRO.NS": "Wipro Limited",
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "^NSEBANK": "NIFTY BANK",
  "^CNXIT": "NIFTY IT",
  "^CNXPHARMA": "NIFTY PHARMA",
  "^CNXAUTO": "NIFTY AUTO",
  "^CNXFMCG": "NIFTY FMCG",
  "^CNXMETAL": "NIFTY METAL",
  "^CNXREALTY": "NIFTY REALTY",
  "^CNXENERGY": "NIFTY ENERGY",
};

// Sectors for mock mode's seeded symbols, matching their real-world sector.
// Unknown symbols fall back to "Other" rather than being fabricated.
const MOCK_SECTORS: Record<string, string> = {
  "RELIANCE.NS": "Energy",
  "TCS.NS": "Technology",
  "INFY.NS": "Technology",
  "HDFCBANK.NS": "Financial Services",
  "ICICIBANK.NS": "Financial Services",
  "SBIN.NS": "Financial Services",
  "ITC.NS": "Consumer Defensive",
  "HINDUNILVR.NS": "Consumer Defensive",
  "BAJFINANCE.NS": "Financial Services",
  "LT.NS": "Industrials",
  "BHARTIARTL.NS": "Communication Services",
  "KOTAKBANK.NS": "Financial Services",
  "MARUTI.NS": "Consumer Cyclical",
  "ASIANPAINT.NS": "Basic Materials",
  "WIPRO.NS": "Technology",
};

// Mock US universe — mirrors the NSE constants above for a handful of
// common tickers, so /portfolio and friends are testable in US mode too
// without a live Yahoo Finance connection.
const US_BASE_PRICES: Record<string, number> = {
  AAPL: 175,
  MSFT: 415,
  GOOGL: 170,
  AMZN: 190,
  META: 480,
  NVDA: 875,
  TSLA: 250,
  JPM: 200,
  "USDINR=X": 84.5,
};

const US_SYMBOL_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corporation",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com, Inc.",
  META: "Meta Platforms, Inc.",
  NVDA: "NVIDIA Corporation",
  TSLA: "Tesla, Inc.",
  JPM: "JPMorgan Chase & Co.",
};

const US_MOCK_SECTORS: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Communication Services",
  AMZN: "Consumer Cyclical",
  META: "Communication Services",
  NVDA: "Technology",
  TSLA: "Consumer Cyclical",
  JPM: "Financial Services",
};

function basePriceFor(symbol: string) {
  if (BASE_PRICES[symbol]) return BASE_PRICES[symbol];
  if (US_BASE_PRICES[symbol]) return US_BASE_PRICES[symbol];
  const rand = mulberry32(seedFromSymbol(symbol));
  return 50 + rand() * 4950;
}

// Time-bucketed so the "current" price is stable within a ~90s window
// (a refresh feels live without values jittering on every render).
function timeBucket() {
  return Math.floor(Date.now() / 90_000);
}

// O(1) in `step` (which is a large, ever-growing time bucket index) — derives
// a plausible price directly instead of replaying the whole walk each call.
function priceAtStep(symbol: string, step: number) {
  const seed = seedFromSymbol(symbol);
  const base = basePriceFor(symbol);
  const trend = Math.sin((step + seed) * 0.05) * 0.06;
  const noise = (mulberry32(seed ^ step)() - 0.5) * 0.03;
  return base * (1 + trend + noise);
}

class MockMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<Quote> {
    const step = timeBucket();
    const price = priceAtStep(symbol, step);
    const previousClose = priceAtStep(symbol, Math.max(step - 1, 0));
    const change = price - previousClose;
    const changePercent = (change / previousClose) * 100;
    return {
      symbol,
      price: Number(price.toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
    };
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return Promise.all(symbols.map((symbol) => this.getQuote(symbol)));
  }

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const pointCounts: Record<HistoryRange, number> = {
      "1D": 48,
      "1W": 42,
      "1M": 30,
      "1Y": 52,
    };
    const intervalMs: Record<HistoryRange, number> = {
      "1D": 30 * 60 * 1000,
      "1W": 4 * 60 * 60 * 1000,
      "1M": 24 * 60 * 60 * 1000,
      "1Y": 7 * 24 * 60 * 60 * 1000,
    };

    const count = pointCounts[range];
    const step = intervalMs[range];
    const now = Date.now();
    const base = basePriceFor(symbol);
    const rand = mulberry32(seedFromSymbol(symbol));

    let price = base * (0.85 + rand() * 0.1);
    const points: HistoryPoint[] = [];
    for (let i = 0; i < count; i++) {
      const drift = (rand() - 0.48) * 0.02;
      price = Math.max(price * (1 + drift), 1);
      points.push({
        timestamp: now - (count - i) * step,
        value: Number(price.toFixed(2)),
      });
    }
    return points;
  }

  async lookupSymbol(symbol: string, market: MarketScope = "NSE"): Promise<SymbolLookup | null> {
    const resolved = normalizeSymbol(symbol, market);
    const quote = await this.getQuote(resolved);
    const names = market === "US" ? US_SYMBOL_NAMES : SYMBOL_NAMES;
    return {
      symbol: resolved,
      name: names[resolved] ?? resolved,
      price: quote.price,
    };
  }

  async searchSymbols(query: string, market: MarketScope = "NSE"): Promise<SymbolSearchResult[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const names = market === "US" ? US_SYMBOL_NAMES : SYMBOL_NAMES;
    const exchange = market === "US" ? "NASDAQ" : "NSE";
    return Object.entries(names)
      .filter(
        ([symbol, name]) =>
          symbol.toLowerCase().includes(q) || name.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map(([symbol, name]) => ({ symbol, name, exchange }));
  }

  async getStockDetails(symbol: string, market: MarketScope = "NSE"): Promise<StockDetails | null> {
    const resolved = normalizeSymbol(symbol, market);
    const quote = await this.getQuote(resolved);
    const base = basePriceFor(resolved);
    const rand = mulberry32(seedFromSymbol(resolved) ^ 0x5eed);
    const fiftyTwoWeekHigh = base * (1.12 + rand() * 0.15);
    const fiftyTwoWeekLow = base * (0.7 - rand() * 0.1);
    const dayHigh = quote.price * (1 + rand() * 0.015);
    const dayLow = quote.price * (1 - rand() * 0.015);
    const names = market === "US" ? US_SYMBOL_NAMES : SYMBOL_NAMES;
    return {
      symbol: resolved,
      name: names[resolved] ?? resolved,
      price: quote.price,
      previousClose: quote.previousClose,
      change: quote.change,
      changePercent: quote.changePercent,
      dayHigh: Number(Math.max(dayHigh, quote.price).toFixed(2)),
      dayLow: Number(Math.min(dayLow, quote.price).toFixed(2)),
      fiftyTwoWeekHigh: Number(fiftyTwoWeekHigh.toFixed(2)),
      fiftyTwoWeekLow: Number(Math.max(fiftyTwoWeekLow, 1).toFixed(2)),
      currency: market === "US" ? "USD" : "INR",
    };
  }

  async getNews(): Promise<NewsArticle[]> {
    // No news source in mock mode — an honest empty state, not fabricated data.
    return [];
  }

  async getSectors(symbols: string[], market: MarketScope = "NSE"): Promise<Record<string, string>> {
    const sectors = market === "US" ? US_MOCK_SECTORS : MOCK_SECTORS;
    return Object.fromEntries(
      symbols.map((symbol) => [symbol, sectors[normalizeSymbol(symbol, market)] ?? "Other"])
    );
  }
}

// Unofficial client for Yahoo Finance's public endpoints (via `yahoo-finance2`).
// Not a supported Yahoo API — treat availability, rate limits, and data
// freshness as best-effort, and never let a failed call break the app.
// Chart history is requested once per holding (portfolio history merges
// every holding's series), so a portfolio with N holdings fires N concurrent
// requests through the single shared queue below on every mount AND every
// background refresh tick — without a cache this can saturate that queue
// and make unrelated navigation (which also needs the same queue) stall
// until the burst drains. History for a given symbol+range barely changes
// within a few minutes, so it's cheap and safe to cache briefly.
const HISTORY_CACHE_TTL_MS = 3 * 60 * 1000;
const NEWS_CACHE_TTL_MS = 60 * 60 * 1000;

class YahooFinanceProvider implements MarketDataProvider {
  // Reserved for single quote() lookups only — the thing every page needs
  // just to render holdings. Bulk fan-outs (one call per holding/watchlist
  // item — chart history, news search, sector lookups) go through
  // `bulkClient` instead, so they can never queue up behind and stall a
  // quote fetch on the page the user just navigated to.
  private client = new YahooFinance({ queue: { concurrency: 8, interval: 150 } });
  private bulkClient = new YahooFinance({ queue: { concurrency: 6, interval: 150 } });
  private historyCache = new Map<string, { points: HistoryPoint[]; expiresAt: number }>();
  private newsCache = new Map<string, { articles: NewsArticle[]; expiresAt: number }>();

  // Yahoo's `Quote` type is a union keyed by instrument type (equity, ETF,
  // ECN quote, etc.) with little in common structurally, so we read the
  // handful of numeric fields we need through a loose, runtime-checked shape
  // rather than the full union.
  private toQuote(raw: unknown): Quote | null {
    const q = raw as {
      symbol?: string;
      regularMarketPrice?: number;
      regularMarketPreviousClose?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
    };
    if (q.regularMarketPrice == null) return null;
    const price = q.regularMarketPrice;
    const previousClose = q.regularMarketPreviousClose ?? price;
    const change = q.regularMarketChange ?? price - previousClose;
    const changePercent =
      q.regularMarketChangePercent ?? (previousClose ? (change / previousClose) * 100 : 0);
    return {
      symbol: q.symbol ?? "",
      price: Number(price.toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
    };
  }

  async getQuote(symbol: string): Promise<Quote> {
    const raw = await this.client.quote(symbol);
    const quote = raw && this.toQuote(raw);
    if (!quote) throw new Error(`No Yahoo Finance quote available for ${symbol}`);
    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    try {
      const raw = await this.client.quote(symbols);
      return raw
        .map((item) => this.toQuote(item))
        .filter((quote): quote is Quote => quote !== null);
    } catch (error) {
      console.error("Yahoo Finance getQuotes failed", error);
      return [];
    }
  }

  async getHistory(symbol: string, range: HistoryRange): Promise<HistoryPoint[]> {
    const cacheKey = `${symbol}:${range}`;
    const cached = this.historyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.points;

    const RANGE_CONFIG: Record<HistoryRange, { interval: "15m" | "1h" | "1d" | "1wk"; days: number }> = {
      "1D": { interval: "15m", days: 1 },
      "1W": { interval: "1h", days: 7 },
      "1M": { interval: "1d", days: 30 },
      "1Y": { interval: "1wk", days: 365 },
    };
    const { interval, days } = RANGE_CONFIG[range];
    const period2 = new Date();
    const period1 = new Date(period2.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const result = await this.bulkClient.chart(symbol, {
        period1,
        period2,
        interval,
        return: "array",
      });
      const points = result.quotes
        .filter((point) => point.close != null)
        .map((point) => ({
          timestamp: point.date.getTime(),
          value: Number(point.close!.toFixed(2)),
        }));
      this.historyCache.set(cacheKey, { points, expiresAt: Date.now() + HISTORY_CACHE_TTL_MS });
      return points;
    } catch (error) {
      console.error(`Yahoo Finance getHistory failed for ${symbol}`, error);
      return [];
    }
  }

  async lookupSymbol(symbol: string, market: MarketScope = "NSE"): Promise<SymbolLookup | null> {
    const resolved = normalizeSymbol(symbol, market);
    try {
      const raw = await this.client.quote(resolved);
      if (!raw || raw.regularMarketPrice == null) return null;
      return {
        symbol: raw.symbol ?? resolved,
        name: raw.longName ?? raw.shortName ?? resolved,
        price: Number(raw.regularMarketPrice.toFixed(2)),
      };
    } catch (error) {
      console.error(`Yahoo Finance lookupSymbol failed for ${resolved}`, error);
      return null;
    }
  }

  async searchSymbols(query: string, market: MarketScope = "NSE"): Promise<SymbolSearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    try {
      const results = await this.client.search(q);
      return results.quotes
        .filter(
          (item): item is typeof item & { symbol: string; exchange: string } =>
            "quoteType" in item &&
            (item.quoteType === "EQUITY" || item.quoteType === "ETF") &&
            "exchange" in item &&
            (market === "US"
              ? US_EQUITY_EXCHANGES.includes(item.exchange as string)
              : item.exchange === "NSI")
        )
        .slice(0, 8)
        .map((item) => {
          // Equity search hits always carry longname/shortname in practice,
          // but the union type doesn't guarantee it structurally.
          const { longname, shortname } = item as { longname?: string; shortname?: string };
          return {
            symbol: item.symbol,
            name: longname ?? shortname ?? item.symbol,
            exchange: market === "US" ? item.exchange : "NSE",
          };
        });
    } catch (error) {
      console.error(`Yahoo Finance searchSymbols failed for "${q}"`, error);
      return [];
    }
  }

  async getStockDetails(symbol: string, market: MarketScope = "NSE"): Promise<StockDetails | null> {
    const resolved = normalizeSymbol(symbol, market);
    try {
      const raw = await this.client.quote(resolved);
      if (!raw || raw.regularMarketPrice == null) return null;
      const q = raw as {
        symbol?: string;
        longName?: string;
        shortName?: string;
        regularMarketPrice?: number;
        regularMarketPreviousClose?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        currency?: string;
      };
      const price = q.regularMarketPrice!;
      const previousClose = q.regularMarketPreviousClose ?? price;
      const change = q.regularMarketChange ?? price - previousClose;
      const changePercent =
        q.regularMarketChangePercent ?? (previousClose ? (change / previousClose) * 100 : 0);
      return {
        symbol: q.symbol ?? resolved,
        name: q.longName ?? q.shortName ?? resolved,
        price: Number(price.toFixed(2)),
        previousClose: Number(previousClose.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        dayHigh: q.regularMarketDayHigh ?? price,
        dayLow: q.regularMarketDayLow ?? price,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? price,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? price,
        currency: q.currency ?? (market === "US" ? "USD" : "INR"),
      };
    } catch (error) {
      console.error(`Yahoo Finance getStockDetails failed for ${resolved}`, error);
      return null;
    }
  }

  async getNews(
    symbol: string,
    companyName: string,
    market: MarketScope = "NSE"
  ): Promise<NewsArticle[]> {
    // The News page fans this out across every holding + watchlist item at
    // once (see /api/news) with no client-side cache of its own — without a
    // short cache here, every visit re-runs the full search burst and can
    // starve quote lookups on whatever page gets navigated to next.
    const cacheKey = `${symbol}:${market}`;
    const cached = this.newsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.articles;

    const articles = await this.fetchNews(symbol, companyName, market);
    this.newsCache.set(cacheKey, { articles, expiresAt: Date.now() + NEWS_CACHE_TTL_MS });
    return articles;
  }

  private async fetchNews(
    symbol: string,
    companyName: string,
    market: MarketScope = "NSE"
  ): Promise<NewsArticle[]> {
    const resolved = normalizeSymbol(symbol, market);

    // US coverage is a direct ticker search — no company-name/ADR dance needed.
    if (market === "US") {
      try {
        const results = await this.bulkClient.search(resolved, { newsCount: 15, quotesCount: 0 });
        return results.news
          .filter((article) => article.relatedTickers?.includes(resolved))
          .filter(isRelevantArticle)
          .slice(0, 8)
          .map((article) => ({
            title: article.title,
            publisher: article.publisher,
            link: article.link,
            publishedAt: article.providerPublishTime.toISOString(),
            thumbnailUrl: article.thumbnail?.resolutions?.[0]?.url ?? null,
            market: "US" as const,
          }))
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      } catch (error) {
        console.error(`Yahoo Finance getNews (US) failed for ${resolved}`, error);
        return [];
      }
    }

    const nseSymbol = resolved;

    // Indian coverage only: search by company name, keep only articles
    // Yahoo explicitly tags with this exact NSE symbol. (This used to also
    // search each symbol's US ADR alias for extra coverage, but that's
    // dropped now — the UI only ever shows a stock's own market's news.)
    try {
      const results = await this.bulkClient.search(stripLegalSuffix(companyName), {
        newsCount: 15,
        quotesCount: 0,
      });
      return results.news
        .filter((article) => article.relatedTickers?.includes(nseSymbol))
        .filter(isRelevantArticle)
        .slice(0, 8)
        .map((article) => ({
          title: article.title,
          publisher: article.publisher,
          link: article.link,
          publishedAt: article.providerPublishTime.toISOString(),
          thumbnailUrl: article.thumbnail?.resolutions?.[0]?.url ?? null,
          market: "IN" as const,
        }))
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } catch (error) {
      console.error(`Yahoo Finance getNews (IN) failed for ${nseSymbol}`, error);
      return [];
    }
  }

  async getSectors(
    symbols: string[],
    market: MarketScope = "NSE"
  ): Promise<Record<string, string>> {
    const entries = await Promise.all(
      symbols.map(async (symbol) => {
        const nseSymbol = normalizeSymbol(symbol, market);
        try {
          const result = await this.bulkClient.quoteSummary(nseSymbol, {
            modules: ["assetProfile"],
          });
          return [nseSymbol, result.assetProfile?.sector ?? "Other"] as const;
        } catch (error) {
          console.error(`Yahoo Finance getSectors failed for ${nseSymbol}`, error);
          return [nseSymbol, "Other"] as const;
        }
      })
    );
    return Object.fromEntries(entries);
  }
}

let cachedProvider: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (cachedProvider) return cachedProvider;
  const providerName = process.env.MARKET_DATA_PROVIDER ?? "mock";

  switch (providerName) {
    case "yahoo":
      cachedProvider = new YahooFinanceProvider();
      break;
    // Adding another live provider (e.g. Finnhub) later only means
    // implementing MarketDataProvider and adding a case here — no
    // call-site changes.
    case "mock":
    default:
      cachedProvider = new MockMarketDataProvider();
  }

  return cachedProvider;
}
