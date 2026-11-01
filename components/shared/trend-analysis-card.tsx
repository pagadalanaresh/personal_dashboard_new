"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockHistory } from "@/hooks/use-stock-history";
import { analyzeTrend, type TrendLabel } from "@/lib/trend-analysis";
import { cn, formatPercent } from "@/lib/utils";

const LABEL_STYLES: Record<TrendLabel, { badge: string; bar: string; icon: typeof TrendingUp }> = {
  Bullish: { badge: "bg-positive/10 text-positive", bar: "bg-positive", icon: TrendingUp },
  Bearish: { badge: "bg-negative/10 text-negative", bar: "bg-negative", icon: TrendingDown },
  Neutral: { badge: "bg-muted text-muted-foreground", bar: "bg-muted-foreground", icon: Minus },
};

export function TrendAnalysisCardSkeleton() {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-44" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-1 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

// Reads 1-month price history for `symbol` and scores it into a simple
// directional trend read — see lib/trend-analysis.ts for the methodology.
// Used on both the stock and index detail pages, since both already show
// a price history chart for the same symbol.
export function TrendAnalysisCard({ symbol }: { symbol: string }) {
  const { points, isLoading } = useStockHistory(symbol, "1M");

  if (isLoading) return <TrendAnalysisCardSkeleton />;

  const trend = analyzeTrend(points);
  if (!trend) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Market trend</CardTitle>
          <CardDescription>Not enough price history yet to score a trend</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { badge, bar, icon: Icon } = LABEL_STYLES[trend.label];

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Market trend</CardTitle>
        <CardDescription>Based on the last 1-month price history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge className={cn("gap-1", badge)}>
            <Icon className="h-3 w-3" aria-hidden />
            {trend.label}
          </Badge>
          <p className="font-tabular text-2xl font-semibold tracking-tight">{trend.score}</p>
        </div>
        <Progress value={trend.score} className="gap-0">
          <ProgressTrack>
            <ProgressIndicator className={bar} />
          </ProgressTrack>
        </Progress>
        <p className="text-xs text-muted-foreground">
          {formatPercent(trend.momentumPercent, { signDisplay: "always" })} over the period &middot;{" "}
          {trend.trendlineDirection} &middot; {Math.round(trend.consistencyPercent)}% of days moved
          with the trend
        </p>
      </CardContent>
    </Card>
  );
}
