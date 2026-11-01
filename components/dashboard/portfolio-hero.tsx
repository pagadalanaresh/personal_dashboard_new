import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { Sparkline } from "@/components/dashboard/sparkline";
import { formatPercent } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";

export function PortfolioHero({
  totalValue,
  dayChange,
  dayChangePercent,
  sparklineData,
  isLoading,
}: {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  sparklineData: number[];
  isLoading: boolean;
}) {
  const { format: fmt, formatSigned: fmtSigned } = useMarket();

  if (isLoading) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-[var(--shadow-card)]">
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total portfolio value</p>
            <p className="font-tabular text-4xl font-semibold tracking-tight sm:text-5xl">
              {fmt(totalValue)}
            </p>
            <ChangeIndicator
              value={dayChange}
              size="md"
              formatted={`${fmtSigned(dayChange)} (${formatPercent(dayChangePercent)}) today`}
            />
          </div>
          <Sparkline
            data={sparklineData}
            positive={dayChange >= 0}
            className="h-24 w-full sm:w-56"
          />
        </div>
      </CardContent>
    </Card>
  );
}
