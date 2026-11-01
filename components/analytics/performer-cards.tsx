import { Trophy, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { formatPercent } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { EnrichedHolding } from "@/lib/holdings";

function PerformerCard({
  title,
  icon: Icon,
  holding,
}: {
  title: string;
  icon: typeof Trophy;
  holding: EnrichedHolding | null;
}) {
  const { format: fmt } = useMarket();
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!holding ? (
          <EmptyState
            icon={Icon}
            title="No data yet"
            description="Add holdings to see your best and worst all-time performers."
            className="border-none py-4"
          />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{holding.symbol.replace(/\.NS$/i, "")}</p>
              <p className="max-w-[16ch] truncate text-xs text-muted-foreground">
                {holding.name}
              </p>
            </div>
            <div className="text-right">
              <ChangeIndicator
                value={holding.gainLossPercent}
                formatted={formatPercent(holding.gainLossPercent)}
                size="md"
              />
              <p className="font-tabular text-xs text-muted-foreground">
                {fmt(holding.gainLoss, { signDisplay: "always" })}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PerformerCards({ holdings }: { holdings: EnrichedHolding[] }) {
  const ranked = [...holdings].sort((a, b) => b.gainLossPercent - a.gainLossPercent);
  const best = ranked[0] ?? null;
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PerformerCard title="Best all-time performer" icon={Trophy} holding={best} />
      <PerformerCard title="Worst all-time performer" icon={TrendingDown} holding={worst} />
    </div>
  );
}
