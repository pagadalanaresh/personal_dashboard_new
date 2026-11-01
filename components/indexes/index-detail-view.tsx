"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { StockChart } from "@/components/stocks/stock-chart";
import { PriceRangeCard, PriceRangeCardSkeleton } from "@/components/stocks/price-range-card";
import { TrendAnalysisCard } from "@/components/shared/trend-analysis-card";
import { useStockDetails } from "@/hooks/use-stock-details";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function IndexDetailView({ symbol }: { symbol: string }) {
  const router = useRouter();
  const { details, isLoading, error } = useStockDetails(symbol);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {error ? (
        <EmptyState icon={SearchX} title="Couldn't load this index" description={error} />
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
              title="Couldn't load this index"
              description={`We couldn't find data for "${symbol}".`}
            />
          ) : (
            <Card className="shadow-[var(--shadow-card)]">
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Index</p>
                  <h2 className="text-xl font-semibold tracking-tight">{details.name}</h2>
                </div>
                <div className="text-right">
                  <p className="font-tabular text-3xl font-semibold tracking-tight">
                    {formatCurrency(details.price)}
                  </p>
                  <ChangeIndicator
                    value={details.change}
                    size="md"
                    formatted={`${formatCurrency(details.change, { signDisplay: "always" })} (${formatPercent(details.changePercent)})`}
                    className="justify-end"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart fetches independently of the header details above. */}
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
                    description="Where the index sits against today's range"
                    price={details.price}
                    low={details.dayLow}
                    high={details.dayHigh}
                    lowLabel="Day Low"
                    highLabel="Day High"
                  />
                  <PriceRangeCard
                    title="52-week range"
                    description="Where today's level sits against the yearly range"
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
        </>
      )}
    </div>
  );
}
