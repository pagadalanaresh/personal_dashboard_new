"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrendAnalysis, TrendLabel } from "@/lib/trend-analysis";
import { cn } from "@/lib/utils";

const LABEL_STYLES: Record<TrendLabel, { badge: string; icon: typeof TrendingUp }> = {
  Bullish: { badge: "bg-positive/10 text-positive", icon: TrendingUp },
  Bearish: { badge: "bg-negative/10 text-negative", icon: TrendingDown },
  Neutral: { badge: "bg-muted text-muted-foreground", icon: Minus },
};

// Compact list-row version of the trend score shown on the stock/index
// detail pages (see components/shared/trend-analysis-card.tsx) — same
// scoring (lib/trend-analysis.ts), just a badge instead of a full card.
// Presentational only: list tables fetch scores for every row up front
// (via useTrendScores) so the column can be sorted, and pass each row's
// result down here rather than this component fetching on its own.
export function TrendBadge({
  trend,
  isLoading,
}: {
  trend: TrendAnalysis | null | undefined;
  isLoading?: boolean;
}) {
  if (isLoading) return <Skeleton className="h-5 w-14" />;
  if (!trend) return <span className="text-xs text-muted-foreground">—</span>;

  const { badge, icon: Icon } = LABEL_STYLES[trend.label];
  return (
    <Badge className={cn("gap-1", badge)} title={`${trend.label} · score ${trend.score}/100`}>
      <Icon className="h-3 w-3" aria-hidden />
      {trend.score}
    </Badge>
  );
}
