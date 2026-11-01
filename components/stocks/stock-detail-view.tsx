"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, SearchX, Plus, Star, X, Archive } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { StockChart } from "@/components/stocks/stock-chart";
import { PriceRangeCard, PriceRangeCardSkeleton } from "@/components/stocks/price-range-card";
import { TrendAnalysisCard } from "@/components/shared/trend-analysis-card";
import { StockNews } from "@/components/stocks/stock-news";
import { ScreenerAnalysisCard } from "@/components/stocks/screener-analysis-card";
import { ScreenerResultsCard } from "@/components/stocks/screener-results-card";
import { ScreenerShareholdingCard } from "@/components/stocks/screener-shareholding-card";
import { ScreenerDocumentsCard } from "@/components/stocks/screener-documents-card";
import { HoldingFormSheet } from "@/components/portfolio/holding-form-sheet";
import {
  ClosePositionSheet,
  type ClosePositionInput,
} from "@/components/portfolio/close-position-sheet";
import { WatchlistFormSheet } from "@/components/watchlist/watchlist-form-sheet";
import { StockTransactionsCard } from "@/components/stocks/stock-transactions-card";
import { useStockDetails } from "@/hooks/use-stock-details";
import { useStockNews } from "@/hooks/use-stock-news";
import { useScreenerData } from "@/hooks/use-screener-data";
import { useHoldings } from "@/hooks/use-holdings";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useClosedPositions } from "@/hooks/use-closed-positions";
import { useMarket } from "@/lib/market-context";
import { displaySymbol, formatPercent } from "@/lib/utils";

async function parseOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function StockDetailView({ symbol }: { symbol: string }) {
  const router = useRouter();
  const { market, format: fmt } = useMarket();
  const { details, isLoading, error } = useStockDetails(symbol);
  const { articles, isLoading: isNewsLoading } = useStockNews(symbol, details?.name);
  const screener = useScreenerData(symbol);
  const { holdings, addHolding, refresh: refreshHoldings } = useHoldings();
  const { items: watchlistItems, addItem, deleteItem } = useWatchlist();
  const { positions: closedPositions, isLoading: isClosedPositionsLoading } = useClosedPositions();

  const [addHoldingOpen, setAddHoldingOpen] = React.useState(false);
  const [addWatchlistOpen, setAddWatchlistOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [removingWatchlist, setRemovingWatchlist] = React.useState(false);

  const holding = details ? holdings.find((h) => h.symbol === details.symbol) ?? null : null;
  const watchlistItem = details
    ? watchlistItems.find((w) => w.symbol === details.symbol) ?? null
    : null;
  const stockClosedPositions = details
    ? closedPositions.filter((p) => p.symbol === details.symbol)
    : [];
  // getNews also surfaces ADR-alias coverage tagged "US" for NSE symbols —
  // keep this page scoped to the stock's own market only.
  const marketArticles = articles.filter((a) => a.market === (market === "US" ? "US" : "IN"));

  async function handleClosePosition(input: ClosePositionInput) {
    if (!holding) return;
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: holding.symbol,
        name: holding.name,
        type: "SELL",
        quantity: input.quantity,
        price: input.price,
        position: holding.position,
        market: holding.market,
      }),
    });
    await parseOrThrow(response);
    await refreshHoldings();
  }

  async function handleRemoveFromWatchlist() {
    if (!watchlistItem) return;
    try {
      await deleteItem(watchlistItem.id);
      toast.success(`Removed ${displaySymbol(watchlistItem.symbol)} from watchlist`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove from watchlist");
    } finally {
      setRemovingWatchlist(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {error ? (
        <EmptyState icon={SearchX} title="Couldn't load this stock" description={error} />
      ) : (
        <>
          {isLoading ? (
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-56" />
              </CardContent>
            </Card>
          ) : !details ? (
            <EmptyState
              icon={SearchX}
              title="Couldn't load this stock"
              description={`We couldn't find data for "${displaySymbol(symbol)}".`}
            />
          ) : (
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {displaySymbol(details.symbol)} &middot; {market === "US" ? "US" : "NSE"}
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight">{details.name}</h2>
                </div>
                <div className="text-right">
                  <p className="font-tabular text-3xl font-semibold tracking-tight">
                    {fmt(details.price)}
                  </p>
                  <ChangeIndicator
                    value={details.change}
                    size="md"
                    formatted={`${fmt(details.change, { signDisplay: "always" })} (${formatPercent(details.changePercent)})`}
                    className="justify-end"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2">
                {holding ? (
                  <Button variant="outline" size="sm" onClick={() => setClosing(true)}>
                    <Archive className="h-3.5 w-3.5" />
                    Exit position
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setAddHoldingOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add to portfolio
                  </Button>
                )}

                {watchlistItem ? (
                  <Button variant="destructive" size="sm" onClick={() => setRemovingWatchlist(true)}>
                    <X className="h-3.5 w-3.5" />
                    Remove from watchlist
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setAddWatchlistOpen(true)}>
                    <Star className="h-3.5 w-3.5" />
                    Add to watchlist
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Chart, news, and screener data all fetch independently of the
              header details above — none of them wait on each other. */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StockChart symbol={symbol} />
            </div>
            <div className="space-y-6">
              {details ? (
                <>
                  <TrendAnalysisCard symbol={symbol} />
                  <PriceRangeCard
                    title="Day range"
                    description="Where the price sits against today's range"
                    price={details.price}
                    low={details.dayLow}
                    high={details.dayHigh}
                    lowLabel="Day Low"
                    highLabel="Day High"
                  />
                  <PriceRangeCard
                    title="52-week range"
                    description="Where today's price sits against the yearly range"
                    price={details.price}
                    low={details.fiftyTwoWeekLow}
                    high={details.fiftyTwoWeekHigh}
                    lowLabel="52W Low"
                    highLabel="52W High"
                  />
                </>
              ) : (
                <>
                  <PriceRangeCardSkeleton />
                  <PriceRangeCardSkeleton />
                </>
              )}
            </div>
          </div>

          {(isClosedPositionsLoading || holding || stockClosedPositions.length > 0) && (
            <StockTransactionsCard
              holding={holding}
              closedPositions={stockClosedPositions}
              isLoading={isClosedPositionsLoading}
            />
          )}

          {(isNewsLoading || marketArticles.length > 0) && (
            <StockNews articles={marketArticles} isLoading={isNewsLoading} />
          )}

          {!screener.notFound && (
            <div className="space-y-6">
              <ScreenerAnalysisCard
                analysis={screener.data?.analysis ?? null}
                isLoading={screener.isLoading}
              />
              <ScreenerResultsCard
                title="Quarterly Results"
                description="Consolidated figures in ₹ Crores — vs. previous quarter"
                table={screener.data?.quarterlyResults ?? null}
                isLoading={screener.isLoading}
                compareSequential
              />
              <ScreenerResultsCard
                title="Profit & Loss"
                description="Consolidated figures in ₹ Crores"
                table={screener.data?.profitLoss ?? null}
                isLoading={screener.isLoading}
              />
              <ScreenerShareholdingCard
                shareholding={screener.data?.shareholding ?? null}
                isLoading={screener.isLoading}
              />
              <ScreenerDocumentsCard
                documents={screener.data?.documents ?? null}
                isLoading={screener.isLoading}
              />
            </div>
          )}

          {details && (
            <>
              <HoldingFormSheet
                open={addHoldingOpen}
                onOpenChange={setAddHoldingOpen}
                holding={null}
                defaultSymbol={{ symbol: details.symbol, name: details.name, price: details.price }}
                onSubmit={addHolding}
              />

              <WatchlistFormSheet
                open={addWatchlistOpen}
                onOpenChange={setAddWatchlistOpen}
                item={null}
                defaultSymbol={{ symbol: details.symbol, name: details.name }}
                onSubmit={addItem}
              />

              <ClosePositionSheet
                open={closing}
                onOpenChange={setClosing}
                holding={holding}
                onSubmit={handleClosePosition}
              />

              <AlertDialog open={removingWatchlist} onOpenChange={setRemovingWatchlist}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {displaySymbol(details.symbol)}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes it from your watchlist. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveFromWatchlist}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </>
      )}
    </div>
  );
}
