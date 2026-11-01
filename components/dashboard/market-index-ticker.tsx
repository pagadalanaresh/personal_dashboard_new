"use client";

import Link from "next/link";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent, indexHref } from "@/lib/utils";
import { useMarketIndexes } from "@/hooks/use-market-indexes";
import type { IndexQuote } from "@/hooks/use-market-indexes";

// `interactive: false` renders a plain (non-focusable) div — used for the
// aria-hidden duplicate row in the marquee, so that row never contributes
// hidden-but-tabbable links to keyboard navigation.
function IndexCard({ index, interactive = true }: { index: IndexQuote; interactive?: boolean }) {
  if (index.price == null || index.change == null || index.changePercent == null) {
    return null;
  }

  const content = (
    <>
      <span className="font-medium">{index.name}</span>
      <span className="font-tabular text-muted-foreground">{formatNumber(index.price)}</span>
      <ChangeIndicator
        value={index.change}
        formatted={`${formatNumber(index.change, { signDisplay: "always" })} (${formatPercent(index.changePercent)})`}
      />
    </>
  );

  if (!interactive) {
    return <div className="flex shrink-0 items-center gap-2 px-6 text-sm">{content}</div>;
  }

  return (
    <Link
      href={indexHref(index.symbol)}
      className="flex shrink-0 items-center gap-2 px-6 text-sm hover:bg-muted/50"
    >
      {content}
    </Link>
  );
}

export function MarketIndexTicker() {
  const { indexes, isLoading } = useMarketIndexes();
  const availableIndexes = indexes.filter((index) => index.price != null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-6 overflow-hidden rounded-xl border border-border bg-card px-6 py-3 shadow-[var(--shadow-card)]">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (availableIndexes.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card py-3 shadow-[var(--shadow-card)]">
      <div className="flex w-max animate-marquee">
        <div className="flex shrink-0 divide-x divide-border">
          {availableIndexes.map((index) => (
            <IndexCard key={index.symbol} index={index} />
          ))}
        </div>
        <div className="flex shrink-0 divide-x divide-border" aria-hidden>
          {availableIndexes.map((index) => (
            <IndexCard key={`${index.symbol}-repeat`} index={index} interactive={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
