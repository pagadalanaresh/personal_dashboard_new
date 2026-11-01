import { Gauge } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatPlainPercent } from "@/lib/utils";
import type { EnrichedHolding } from "@/lib/holdings";

function concentrationLabel(topWeight: number) {
  if (topWeight >= 50) {
    return {
      label: "Concentrated",
      className: "bg-negative-muted text-negative",
      description: "sits in a single holding — a move in that stock will dominate your returns.",
    };
  }
  if (topWeight >= 25) {
    return {
      label: "Balanced",
      className: "bg-warning-muted text-warning-foreground",
      description: "is in your top holding — meaningful, but not dominant.",
    };
  }
  return {
    label: "Diversified",
    className: "bg-positive-muted text-positive",
    description: "is in your top holding — no single position drives your portfolio.",
  };
}

export function ConcentrationCard({ holdings }: { holdings: EnrichedHolding[] }) {
  const total = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const top = [...holdings].sort((a, b) => b.marketValue - a.marketValue)[0];
  const topWeight = top && total > 0 ? (top.marketValue / total) * 100 : 0;
  const meta = concentrationLabel(topWeight);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          Concentration
        </CardTitle>
        <CardDescription>How much your portfolio leans on one holding</CardDescription>
      </CardHeader>
      <CardContent>
        {!top ? (
          <EmptyState
            icon={Gauge}
            title="No data yet"
            description="Add holdings to see a concentration insight."
            className="border-none py-4"
          />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-tabular font-semibold text-foreground">
                {formatPlainPercent(topWeight)}
              </span>{" "}
              {meta.description}
            </p>
            <Badge className={cn("shrink-0", meta.className)}>{meta.label}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
