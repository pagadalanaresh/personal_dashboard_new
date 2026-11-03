"use client";

import * as React from "react";
import Link from "next/link";
import { Layers, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MarketIndexTicker } from "@/components/dashboard/market-index-ticker";
import { StockSearch } from "@/components/dashboard/stock-search";
import { PortfolioHero } from "@/components/dashboard/portfolio-hero";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MarketStatus } from "@/components/dashboard/market-status";
import { AllocationChart } from "@/components/dashboard/allocation-chart";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { GainersLosers } from "@/components/dashboard/gainers-losers";
import { WatchlistAlertsPanel } from "@/components/dashboard/watchlist-alerts-panel";
import { RecentTransactionsPanel } from "@/components/dashboard/recent-transactions-panel";
import { CurrencyToggle } from "@/components/shared/currency-toggle";
import { Button } from "@/components/ui/button";
import { useHoldings } from "@/hooks/use-holdings";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useTransactions } from "@/hooks/use-transactions";
import { usePortfolioHistory } from "@/hooks/use-portfolio-history";
import { useMarket } from "@/lib/market-context";
import { formatPercent } from "@/lib/utils";

export default function DashboardPage() {
  const { market, format: fmt, formatSigned: fmtSigned } = useMarket();
  const {
    holdings,
    isLoading,
    isRefreshing,
    lastUpdated,
    refresh,
  } = useHoldings();
  const { items: watchlistItems, isLoading: isWatchlistLoading } = useWatchlist();
  const { transactions, isLoading: isTransactionsLoading } = useTransactions();
  const [historyTick, setHistoryTick] = React.useState(0);
  const { points: sparklinePoints } = usePortfolioHistory("1D", historyTick);

  async function handleRefresh() {
    await refresh();
    setHistoryTick((t) => t + 1);
  }

  const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasisTotal, 0);
  const totalGainLoss = totalMarketValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis === 0 ? 0 : (totalGainLoss / totalCostBasis) * 100;
  const totalDayChange = holdings.reduce((sum, h) => sum + h.dayChange, 0);
  const previousTotal = totalMarketValue - totalDayChange;
  const totalDayChangePercent = previousTotal === 0 ? 0 : (totalDayChange / previousTotal) * 100;

  const hasHoldings = holdings.length > 0;

  return (
    <div className="space-y-6">
      {market === "NSE" && <MarketIndexTicker />}

      <PageHeader
        title="Dashboard"
        description="A snapshot of your portfolio and today's market activity."
        actions={
          <div className="flex items-center gap-2">
            {market === "US" && <CurrencyToggle />}
            <MarketStatus
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          </div>
        }
      />

      <StockSearch />

      {!isLoading && !hasHoldings ? (
        <EmptyState
          icon={Wallet}
          title="Your dashboard is ready — add a holding to see it come alive"
          description="Once you add a position, your portfolio value, allocation, and performance will show up here automatically."
          action={
            <Button nativeButton={false} render={<Link href="/portfolio" />}>
              Add your first holding
            </Button>
          }
        />
      ) : (
        <>
          <PortfolioHero
            totalValue={totalMarketValue}
            dayChange={totalDayChange}
            dayChangePercent={totalDayChangePercent}
            sparklineData={sparklinePoints.map((p) => p.value)}
            isLoading={isLoading}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Total gain / loss"
              value={fmt(totalGainLoss, { signDisplay: "always" })}
              changeValue={totalGainLossPercent}
              changeFormatted={formatPercent(totalGainLossPercent)}
              icon={totalGainLoss >= 0 ? TrendingUp : TrendingDown}
              isLoading={isLoading}
            />
            <MetricCard
              title="Today's change"
              value={fmtSigned(totalDayChange)}
              changeValue={totalDayChangePercent}
              changeFormatted={formatPercent(totalDayChangePercent)}
              icon={totalDayChange >= 0 ? TrendingUp : TrendingDown}
              isLoading={isLoading}
            />
            <MetricCard
              title="Holdings"
              value={String(holdings.length)}
              icon={Layers}
              isLoading={isLoading}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PerformanceChart hasHoldings={hasHoldings} refreshKey={historyTick} />
            </div>
            <AllocationChart holdings={holdings} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <GainersLosers holdings={holdings} />
            <WatchlistAlertsPanel items={watchlistItems} isLoading={isWatchlistLoading} />
            <RecentTransactionsPanel transactions={transactions} isLoading={isTransactionsLoading} />
          </div>
        </>
      )}
    </div>
  );
}
