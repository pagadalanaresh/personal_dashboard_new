import { PieChart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatPlainPercent } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import { CHART_COLORS } from "@/lib/chart-colors";
import type { EnrichedHolding } from "@/lib/holdings";

export function AllocationBreakdown({ holdings }: { holdings: EnrichedHolding[] }) {
  const { format: fmt } = useMarket();
  const total = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const ranked = [...holdings].sort((a, b) => b.marketValue - a.marketValue);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Allocation breakdown</CardTitle>
        <CardDescription>Portfolio weight by holding, ranked</CardDescription>
      </CardHeader>
      <CardContent>
        {ranked.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="Nothing to break down yet"
            description="Add holdings to see your allocation ranked by weight."
            className="border-none py-6"
          />
        ) : (
          <div className="space-y-3">
            {ranked.map((holding, index) => {
              const weight = total === 0 ? 0 : (holding.marketValue / total) * 100;
              const color = CHART_COLORS[index % CHART_COLORS.length];
              return (
                <div key={holding.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {holding.symbol.replace(/\.NS$/i, "")}
                    </span>
                    <span className="font-tabular text-muted-foreground">
                      {fmt(holding.marketValue)} &middot;{" "}
                      {formatPlainPercent(weight)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${weight}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
