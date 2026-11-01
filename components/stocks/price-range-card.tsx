import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarket } from "@/lib/market-context";

export function PriceRangeCardSkeleton() {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="mt-2 flex items-center justify-between">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-14" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PriceRangeCard({
  title,
  description,
  price,
  low,
  high,
  lowLabel,
  highLabel,
}: {
  title: string;
  description: string;
  price: number;
  low: number;
  high: number;
  lowLabel: string;
  highLabel: string;
}) {
  const { format: fmt } = useMarket();
  const range = high - low;
  const positionPercent = range <= 0 ? 50 : Math.min(100, Math.max(0, ((price - low) / range) * 100));

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative pt-2 pb-1">
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-negative/40 via-muted to-positive/40" />
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${positionPercent}%` }}
          >
            <span className="h-3.5 w-3.5 rounded-full border-2 border-background bg-primary shadow" />
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{lowLabel}</p>
            <p className="font-tabular font-medium">{fmt(low)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="font-tabular font-medium text-primary">{fmt(price)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{highLabel}</p>
            <p className="font-tabular font-medium">{fmt(high)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
