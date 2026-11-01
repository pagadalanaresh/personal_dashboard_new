import Link from "next/link";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { displaySymbol, formatPercent, stockHref } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { EnrichedHolding } from "@/lib/holdings";

function MoverRow({ holding }: { holding: EnrichedHolding }) {
  const { format: fmt } = useMarket();
  return (
    <Link
      href={stockHref(holding.symbol)}
      className="flex items-center justify-between py-2 hover:bg-muted/40 -mx-2 px-2 rounded-md"
    >
      <div>
        <p className="text-sm font-medium">{displaySymbol(holding.symbol)}</p>
        <p className="font-tabular text-xs text-muted-foreground">
          {fmt(holding.price)}
        </p>
      </div>
      <ChangeIndicator
        value={holding.dayChangePercent}
        formatted={formatPercent(holding.dayChangePercent)}
      />
    </Link>
  );
}

export function GainersLosers({ holdings }: { holdings: EnrichedHolding[] }) {
  const sorted = [...holdings].sort((a, b) => b.dayChangePercent - a.dayChangePercent);
  const gainers = sorted.filter((h) => h.dayChangePercent > 0).slice(0, 3);
  const losers = sorted
    .filter((h) => h.dayChangePercent < 0)
    .slice(-3)
    .reverse();

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Today&apos;s movers</CardTitle>
        <CardDescription>Best and worst performers in your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        {holdings.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No movers yet"
            description="Add holdings to see today's top gainers and losers."
            className="border-none py-6"
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Gainers
              </p>
              <div className="divide-y divide-border">
                {gainers.length > 0 ? (
                  gainers.map((h) => <MoverRow key={h.id} holding={h} />)
                ) : (
                  <p className="py-2 text-sm text-muted-foreground">No gainers today</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Losers
              </p>
              <div className="divide-y divide-border">
                {losers.length > 0 ? (
                  losers.map((h) => <MoverRow key={h.id} holding={h} />)
                ) : (
                  <p className="py-2 text-sm text-muted-foreground">No losers today</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
