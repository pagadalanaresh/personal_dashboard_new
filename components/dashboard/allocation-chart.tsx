"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FullscreenChartButton,
  FullscreenChartDialog,
} from "@/components/shared/fullscreen-chart-dialog";
import { formatPlainPercent } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import { CHART_COLORS } from "@/lib/chart-colors";
import type { EnrichedHolding } from "@/lib/holdings";

export function AllocationChart({ holdings }: { holdings: EnrichedHolding[] }) {
  const { format: fmt } = useMarket();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const total = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const data = holdings
    .map((h) => ({ symbol: h.symbol, value: h.marketValue }))
    .sort((a, b) => b.value - a.value);

  function renderContent(pieSizeClassName: string) {
    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className={`${pieSizeClassName} shrink-0`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="symbol"
                innerRadius="62%"
                outerRadius="100%"
                paddingAngle={data.length > 1 ? 2 : 0}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.symbol} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => {
                  const amount = Number(value) || 0;
                  return [
                    `${fmt(amount)} (${formatPlainPercent((amount / total) * 100)})`,
                    item.payload.symbol as string,
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
          {data.map((entry, index) => (
            <li key={entry.symbol} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                {entry.symbol}
              </span>
              <span className="font-tabular text-muted-foreground">
                {formatPlainPercent((entry.value / total) * 100)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Card className="relative shadow-[var(--shadow-card)]">
      {data.length > 0 && (
        <FullscreenChartButton label="allocation chart" onClick={() => setIsFullscreen(true)} />
      )}
      <CardHeader className="pr-11">
        <CardTitle>Allocation</CardTitle>
        <CardDescription>Portfolio weight by holding</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={PieChartIcon}
            title="Nothing to allocate yet"
            description="Add holdings to see your portfolio breakdown."
            className="border-none py-6"
          />
        ) : (
          renderContent("h-52 w-52")
        )}
      </CardContent>
      <FullscreenChartDialog
        open={isFullscreen}
        onOpenChange={setIsFullscreen}
        title="Allocation"
        description="Portfolio weight by holding"
      >
        {renderContent("h-[60vh] w-[60vh] max-h-full max-w-full")}
      </FullscreenChartDialog>
    </Card>
  );
}
