"use client";

import Link from "next/link";
import { Newspaper, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewsFeed } from "@/components/news/news-feed";
import { useAllStockNews } from "@/hooks/use-all-stock-news";
import { useHoldings } from "@/hooks/use-holdings";
import { useWatchlist } from "@/hooks/use-watchlist";

export default function NewsPage() {
  const { holdings, isLoading: isHoldingsLoading } = useHoldings();
  const { items: watchlistItems, isLoading: isWatchlistLoading } = useWatchlist();
  const { articles, isLoading: isNewsLoading, refresh } = useAllStockNews();

  const isTrackingLoading = isHoldingsLoading || isWatchlistLoading;
  const hasTrackedStocks = holdings.length > 0 || watchlistItems.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Latest news across your holdings and watchlist."
        actions={
          <Button variant="outline" size="sm" onClick={refresh} disabled={isNewsLoading}>
            <RefreshCw className={isNewsLoading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            Refresh
          </Button>
        }
      />

      {!isTrackingLoading && !hasTrackedStocks ? (
        <EmptyState
          icon={Newspaper}
          title="No stocks to show news for yet"
          description="Add a holding or a watchlist item and its news will show up here."
          action={
            <Button nativeButton={false} render={<Link href="/portfolio" />}>
              Go to Portfolio
            </Button>
          }
        />
      ) : (
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent>
            <NewsFeed articles={articles} isLoading={isNewsLoading} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
