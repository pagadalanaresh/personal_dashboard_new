"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FullscreenChartButton,
  FullscreenChartDialog,
} from "@/components/shared/fullscreen-chart-dialog";
import { usePortfolioHistory } from "@/hooks/use-portfolio-history";
import { useMarket } from "@/lib/market-context";
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

export function PerformanceChart({ hasHoldings, refreshKey }: { hasHoldings: boolean; refreshKey: number }) {
  const { formatCompact: fmtCompact } = useMarket();
  const [range, setRange] = React.useState<HistoryRange>("1M");
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { points, isLoading } = usePortfolioHistory(range, refreshKey);

  const isPositive = points.length > 1 && points[points.length - 1].value >= points[0].value;

  function renderChart(heightClassName: string) {
    return (
      <div className={`${heightClassName} w-full`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="performance-gradient" x1="0" y1="0" x2="0" y2="1">
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
              fill="url(#performance-gradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <Card className="relative shadow-[var(--shadow-card)]">
      {hasHoldings && !isLoading && points.length > 0 && (
        <FullscreenChartButton label="performance chart" onClick={() => setIsFullscreen(true)} />
      )}
      <CardHeader className="flex-row items-center justify-between pr-11">
        <div>
          <CardTitle>Performance</CardTitle>
          <CardDescription>Portfolio value over time</CardDescription>
        </div>
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
        {!hasHoldings ? (
          <EmptyState
            icon={LineChartIcon}
            title="No performance data yet"
            description="Once you add holdings, your portfolio's value over time will show up here."
            className="border-none py-6"
          />
        ) : isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          renderChart("h-64")
        )}
      </CardContent>
      <FullscreenChartDialog
        open={isFullscreen}
        onOpenChange={setIsFullscreen}
        title="Performance"
        description="Portfolio value over time"
      >
        {renderChart("h-full")}
      </FullscreenChartDialog>
    </Card>
  );
}
