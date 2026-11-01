import "server-only";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.screener.in";
// Screener figures change at most quarterly (results) or on corporate
// actions (shareholding, documents) — a long TTL avoids hammering a
// third-party site we don't control on every page view.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
// A failed fetch (network blip, transient block, timeout) shouldn't hide a
// stock's data for the same 12 hours as a real success — retry soon instead.
const FAILURE_CACHE_TTL_MS = 2 * 60 * 1000;

export type ScreenerRow = {
  label: string;
  values: (string | null)[];
  variant: "default" | "strong" | "sub";
};
export type ScreenerTable = { periods: string[]; rows: ScreenerRow[] };
export type ScreenerLink = { label: string; url: string; meta: string | null };
export type ScreenerConcall = { period: string; links: ScreenerLink[] };

export type ScreenerAnalysis = { pros: string[]; cons: string[] };

export type ScreenerData = {
  sourceUrl: string;
  analysis: ScreenerAnalysis | null;
  quarterlyResults: ScreenerTable | null;
  profitLoss: ScreenerTable | null;
  shareholding: { quarterly: ScreenerTable | null; yearly: ScreenerTable | null };
  documents: {
    announcements: ScreenerLink[];
    annualReports: ScreenerLink[];
    creditRatings: ScreenerLink[];
    concalls: ScreenerConcall[];
  };
};

const cache = new Map<string, { data: ScreenerData | null; expiresAt: number }>();

function toScreenerSymbol(symbol: string) {
  return symbol.replace(/\.NS$/i, "").toUpperCase();
}

function parseTable($: cheerio.CheerioAPI, table: ReturnType<typeof $>): ScreenerTable {
  const periods = table
    .find("thead th")
    .slice(1)
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const rows: ScreenerRow[] = table
    .find("tbody tr")
    .map((_, tr) => {
      const $tr = $(tr);
      const cells = $tr.find("td");
      const labelCell = cells.first();
      const label = labelCell.clone().find("span").remove().end().text().replace(/\s+/g, " ").trim();
      const values = cells
        .slice(1)
        .map((__, td) => {
          const text = $(td).text().trim();
          return text.length > 0 ? text : null;
        })
        .get();
      const variant = $tr.hasClass("strong") ? "strong" : $tr.hasClass("sub") ? "sub" : "default";
      return { label, values, variant } as ScreenerRow;
    })
    .get()
    // Drops rows with no readable value cells at all — e.g. Screener's
    // "Raw PDF" row, whose cells are icon-only links with no text content.
    .filter((row) => row.label.length > 0 && row.values.length > 0);

  return { periods, rows };
}

function parseAnalysis($: cheerio.CheerioAPI, section: ReturnType<typeof $>): ScreenerAnalysis | null {
  const pros = section
    .find(".pros li")
    .map((_, li) => $(li).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const cons = section
    .find(".cons li")
    .map((_, li) => $(li).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  if (pros.length === 0 && cons.length === 0) return null;
  return { pros, cons };
}

function parseLinkList($: cheerio.CheerioAPI, ul: ReturnType<typeof $>): ScreenerLink[] {
  return ul
    .find("> li")
    .map((_, li) => {
      const a = $(li).find("a[href]").first();
      if (a.length === 0) return null;
      const label = a.clone().children().remove().end().text().replace(/\s+/g, " ").trim();
      const meta = a.find(".ink-600.smaller").first().text().replace(/\s+/g, " ").trim() || null;
      const href = a.attr("href");
      if (!label || !href) return null;
      return { label, url: href, meta };
    })
    .get()
    .filter((link): link is ScreenerLink => link !== null);
}

function parseConcalls($: cheerio.CheerioAPI, ul: ReturnType<typeof $>): ScreenerConcall[] {
  return ul
    .find("> li")
    .map((_, li) => {
      const period = $(li).find("div").first().text().trim();
      const links = $(li)
        .find("a.concall-link[href]")
        .map((__, a) => ({
          label: $(a).text().trim(),
          url: $(a).attr("href") ?? "",
          meta: null,
        }))
        .get()
        .filter((link) => link.label && link.url);
      return { period, links };
    })
    .get()
    .filter((entry) => entry.period.length > 0 && entry.links.length > 0);
}

async function fetchScreenerHtml(screenerSymbol: string): Promise<string | null> {
  const url = `${BASE_URL}/company/${encodeURIComponent(screenerSymbol)}/consolidated/`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Wealthfolio/1.0; personal portfolio tracker)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.text();
}

export async function getScreenerData(symbol: string): Promise<ScreenerData | null> {
  const screenerSymbol = toScreenerSymbol(symbol);
  const cached = cache.get(screenerSymbol);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let data: ScreenerData | null = null;
  try {
    const html = await fetchScreenerHtml(screenerSymbol);
    if (html) {
      const $ = cheerio.load(html);
      const sourceUrl = `${BASE_URL}/company/${screenerSymbol}/consolidated/`;

      const analysis = parseAnalysis($, $("#analysis"));
      const quartersTable = $("#quarters [data-result-table] table").first();
      const plTable = $("#profit-loss [data-result-table] table").first();
      const shpQuarterly = $("#quarterly-shp table").first();
      const shpYearly = $("#yearly-shp table").first();

      let announcements: ScreenerLink[] = [];
      let annualReports: ScreenerLink[] = [];
      let creditRatings: ScreenerLink[] = [];
      let concalls: ScreenerConcall[] = [];

      $("#documents .documents").each((_, el) => {
        const block = $(el);
        const heading = block.find("h3").first().text().trim().toLowerCase();
        const list = block.find("ul.list-links").first();
        if (list.length === 0) return;
        if (heading.includes("announcement")) announcements = parseLinkList($, list);
        else if (heading.includes("annual report")) annualReports = parseLinkList($, list);
        else if (heading.includes("credit rating")) creditRatings = parseLinkList($, list);
        else if (heading.includes("concall")) concalls = parseConcalls($, list);
      });

      data = {
        sourceUrl,
        analysis,
        quarterlyResults: quartersTable.length ? parseTable($, quartersTable) : null,
        profitLoss: plTable.length ? parseTable($, plTable) : null,
        shareholding: {
          quarterly: shpQuarterly.length ? parseTable($, shpQuarterly) : null,
          yearly: shpYearly.length ? parseTable($, shpYearly) : null,
        },
        documents: { announcements, annualReports, creditRatings, concalls },
      };
    }
  } catch (error) {
    console.error(`screener.in fetch failed for ${screenerSymbol}`, error);
    data = null;
  }

  const ttl = data ? CACHE_TTL_MS : FAILURE_CACHE_TTL_MS;
  cache.set(screenerSymbol, { data, expiresAt: Date.now() + ttl });
  return data;
}
