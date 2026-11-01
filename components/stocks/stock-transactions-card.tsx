"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { formatPercent, formatNumber } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { EnrichedHolding } from "@/lib/holdings";
import type { ClosedPosition } from "@/lib/closed-positions";

const PAGE_SIZE = 5;

type Entry = {
  key: string;
  status: "Open" | "Closed";
  dateLabel: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number | null;
  pl: number;
  plPercent: number;
};

function useVisibleCount(total: number) {
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, total));
        }
      },
      { root: sentinel.parentElement, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [total]);

  return { visibleCount, sentinelRef };
}

export function StockTransactionsCard({
  holding,
  closedPositions,
  isLoading,
}: {
  holding: EnrichedHolding | null;
  closedPositions: ClosedPosition[];
  isLoading: boolean;
}) {
  const { format: fmt } = useMarket();

  const entries: Entry[] = [
    ...(holding
      ? [
          {
            key: "current",
            status: "Open" as const,
            dateLabel: "Open position",
            quantity: holding.quantity,
            buyPrice: holding.avgCostBasis,
            sellPrice: holding.price,
            pl: holding.gainLoss,
            plPercent: holding.gainLossPercent,
          },
        ]
      : []),
    ...closedPositions.map((position) => ({
      key: position.transactionIds.join(","),
      status: "Closed" as const,
      dateLabel: `Closed ${format(new Date(position.closeDate), "d MMM yyyy")}`,
      quantity: position.quantity,
      buyPrice: position.quantity === 0 ? 0 : position.totalInvested / position.quantity,
      sellPrice: position.quantity === 0 ? 0 : position.totalProceeds / position.quantity,
      pl: position.realizedPL,
      plPercent: position.realizedPLPercent,
    })),
  ];

  const { visibleCount, sentinelRef } = useVisibleCount(entries.length);
  const visibleEntries = entries.slice(0, visibleCount);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Profit &amp; loss</CardTitle>
        <CardDescription>Current position and past episodes for this stock</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Position</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-center font-medium">Price</th>
                  <th className="px-3 py-2 text-right font-medium">P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleEntries.map((entry) => (
                  <tr key={entry.key}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{entry.status}</p>
                      <p className="text-xs text-muted-foreground">{entry.dateLabel}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-tabular text-muted-foreground">
                      {formatNumber(entry.quantity)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-tabular text-muted-foreground">
                      <p>Buy {fmt(entry.buyPrice)}</p>
                      {entry.sellPrice != null && (
                        <p>{entry.status === "Open" ? "Now" : "Sold"} {fmt(entry.sellPrice)}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <ChangeIndicator
                        value={entry.pl}
                        formatted={fmt(entry.pl, { signDisplay: "always" })}
                        className="justify-end"
                      />
                      <p className="text-xs text-muted-foreground">{formatPercent(entry.plPercent)}</p>
                    </td>
                  </tr>
                ))}
                {visibleCount < entries.length && (
                  <tr>
                    <td colSpan={4}>
                      <div ref={sentinelRef} className="h-6" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
