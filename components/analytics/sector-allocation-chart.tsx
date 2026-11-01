"use client";

import * as React from "react";
import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon, X } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FullscreenChartButton,
  FullscreenChartDialog,
} from "@/components/shared/fullscreen-chart-dialog";
import {
  displaySymbol,
  formatPercent,
  formatPlainPercent,
  stockHref,
} from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { CHART_COLORS } from "@/lib/chart-colors";
import { useSectors } from "@/hooks/use-sectors";
import type { EnrichedHolding } from "@/lib/holdings";

export function SectorAllocationChart({ holdings }: { holdings: EnrichedHolding[] }) {
  const { format: fmt } = useMarket();
  const { sectors, isLoading } = useSectors(holdings.map((h) => h.symbol));
  const [selectedSector, setSelectedSector] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const bySector = new Map<string, number>();
  for (const holding of holdings) {
    const sector = sectors[holding.symbol] ?? "Other";
    bySector.set(sector, (bySector.get(sector) ?? 0) + holding.marketValue);
  }
  const total = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const data = Array.from(bySector, ([sector, value]) => ({ sector, value })).sort(
    (a, b) => b.value - a.value
  );

  function toggleSector(sector: string) {
    setSelectedSector((prev) => (prev === sector ? null : sector));
  }

  const activeSector = selectedSector && bySector.has(selectedSector) ? selectedSector : null;
  const sectorHoldings = activeSector
    ? holdings
        .filter((h) => (sectors[h.symbol] ?? "Other") === activeSector)
        .sort((a, b) => b.marketValue - a.marketValue)
    : [];

  function renderContent(pieSizeClassName: string) {
    return (
      <>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className={`${pieSizeClassName} shrink-0`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="sector"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={data.length > 1 ? 2 : 0}
                  strokeWidth={0}
                  onClick={(entry) =>
                    toggleSector((entry as unknown as { sector: string }).sector)
                  }
                  className="cursor-pointer"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.sector}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke={selectedSector === entry.sector ? "var(--card)" : undefined}
                      strokeWidth={selectedSector === entry.sector ? 2 : 0}
                      opacity={selectedSector && selectedSector !== entry.sector ? 0.35 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, item) => {
                    const amount = Number(value) || 0;
                    return [
                      `${fmt(amount)} (${formatPlainPercent((amount / total) * 100)})`,
                      item.payload.sector as string,
                    ];
                  }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 space-y-2">
            {data.map((entry, index) => {
              const isSelected = selectedSector === entry.sector;
              return (
                <li key={entry.sector}>
                  <button
                    type="button"
                    onClick={() => toggleSector(entry.sector)}
                    className={`flex w-full items-center justify-between rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-accent ${
                      isSelected ? "bg-accent" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className={isSelected ? "font-medium" : ""}>{entry.sector}</span>
                    </span>
                    <span className="font-tabular text-muted-foreground">
                      {formatPlainPercent((entry.value / total) * 100)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {activeSector && (
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">
                {activeSector}{" "}
                <span className="text-muted-foreground">
                  &middot; {sectorHoldings.length} holding{sectorHoldings.length === 1 ? "" : "s"}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSelectedSector(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
            <ul className="space-y-1.5">
              {sectorHoldings.map((holding) => (
                <li key={holding.id}>
                  <Link
                    href={stockHref(holding.symbol)}
                    className="flex items-center justify-between rounded-md px-1.5 py-1 text-sm hover:bg-accent"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{displaySymbol(holding.symbol)}</span>
                      <span className="max-w-[20ch] truncate text-xs text-muted-foreground">
                        {holding.name}
                      </span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="font-tabular">{fmt(holding.marketValue)}</span>
                      <ChangeIndicator
                        value={holding.gainLossPercent}
                        formatted={formatPercent(holding.gainLossPercent)}
                        className="text-xs"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  return (
    <Card className="relative shadow-[var(--shadow-card)]">
      {data.length > 0 && (
        <FullscreenChartButton label="sector allocation chart" onClick={() => setIsFullscreen(true)} />
      )}
      <CardHeader className="pr-11">
        <CardTitle>Sector allocation</CardTitle>
        <CardDescription>Portfolio weight by sector — select a slice to see its holdings</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-52 w-52 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={PieChartIcon}
            title="Nothing to allocate yet"
            description="Add holdings to see your sector breakdown."
            className="border-none py-6"
          />
        ) : (
          renderContent("h-52 w-52")
        )}
      </CardContent>
      <FullscreenChartDialog
        open={isFullscreen}
        onOpenChange={setIsFullscreen}
        title="Sector allocation"
        description="Portfolio weight by sector — select a slice to see its holdings"
      >
        {renderContent("h-[60vh] w-[60vh] max-h-full max-w-full")}
      </FullscreenChartDialog>
    </Card>
  );
}
