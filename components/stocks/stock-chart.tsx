"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FullscreenChartButton,
  FullscreenChartDialog,
} from "@/components/shared/fullscreen-chart-dialog";
import { useMarket } from "@/lib/market-context";
import { useStockHistory } from "@/hooks/use-stock-history";
import type { HistoryRange } from "@/lib/market-data";

const RANGES: HistoryRange[] = ["1D", "1W", "1M", "1Y"];

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: { timestamp: number } }[];
}) {
  const { format: fmt } = useMarket();
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-popover)]">
      <p className="text-muted-foreground">
        {new Date(point.payload.timestamp).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
      <p className="font-tabular font-medium">{fmt(point.value)}</p>
    </div>
  );
}

export function StockChart({ symbol }: { symbol: string }) {
  const { formatCompact: fmtCompact } = useMarket();
  const [range, setRange] = React.useState<HistoryRange>("1M");
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { points, isLoading } = useStockHistory(symbol, range);

  const isPositive = points.length > 1 && points[points.length - 1].value >= points[0].value;

  function renderChart(heightClassName: string) {
    return (
      <div className={`${heightClassName} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="stock-chart-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? "var(--positive)" : "var(--negative)"}
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "var(--positive)" : "var(--negative)"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(t) =>
                new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              }
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              tickFormatter={(v) => fmtCompact(v)}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={56}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "var(--positive)" : "var(--negative)"}
              strokeWidth={2}
              fill="url(#stock-chart-gradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <Card className="relative shadow-[var(--shadow-card)]">
      {!isLoading && points.length > 0 && (
        <FullscreenChartButton label="price chart" onClick={() => setIsFullscreen(true)} />
      )}
      <CardHeader className="flex-row items-center justify-between pr-11">
        <CardTitle>Price chart</CardTitle>
        <Tabs value={range} onValueChange={(v) => setRange(v as HistoryRange)}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r} value={r}>
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : points.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No chart data available right now.
          </div>
        ) : (
          renderChart("h-72")
        )}
      </CardContent>
      <FullscreenChartDialog
        open={isFullscreen}
        onOpenChange={setIsFullscreen}
        title="Price chart"
      >
        {renderChart("h-full")}
      </FullscreenChartDialog>
    </Card>
  );
}
