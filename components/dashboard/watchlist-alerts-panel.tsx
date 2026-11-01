import Link from "next/link";
import { Bell } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { displaySymbol, stockHref } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { EnrichedWatchlistItem } from "@/lib/watchlist";

export function WatchlistAlertsPanel({
  items,
  isLoading,
}: {
  items: EnrichedWatchlistItem[];
  isLoading: boolean;
}) {
  const { format: fmt } = useMarket();
  const alerts = items.filter((item) => item.alert !== null).slice(0, 5);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Watchlist alerts</CardTitle>
        <CardDescription>Symbols near your target price</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : alerts.length > 0 ? (
          <div className="divide-y divide-border">
            {alerts.map((item) => (
              <Link
                key={item.id}
                href={stockHref(item.symbol)}
                className="-mx-2 flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40"
              >
                <div>
                  <p className="text-sm font-medium">{displaySymbol(item.symbol)}</p>
                  <p className="font-tabular text-xs text-muted-foreground">
                    {fmt(item.price)} &middot; target {fmt(item.targetPrice ?? 0)}
                  </p>
                </div>
                <Badge className="gap-1 bg-warning-muted text-warning-foreground">
                  <Bell className="h-3 w-3" />
                  {item.alert === "above" ? "Crossed" : "Near"}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No alerts right now"
            description={
              items.length > 0
                ? "None of your watchlist symbols are near their target price yet."
                : "Set target prices on your watchlist to get notified when a symbol gets close."
            }
            className="border-none py-6"
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/watchlist" />}
              >
                Go to watchlist
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
