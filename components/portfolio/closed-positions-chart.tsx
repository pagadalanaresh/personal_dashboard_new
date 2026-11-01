"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FullscreenChartButton,
  FullscreenChartDialog,
} from "@/components/shared/fullscreen-chart-dialog";
import { displaySymbol } from "@/lib/utils";
import { useMarket } from "@/lib/market-context";
import type { ClosedPosition } from "@/lib/closed-positions";

type Segment = { key: string; symbol: string; realizedPL: number };
type ChartPoint = {
  dayKey: string;
  label: string;
  totalAbs: number;
  netPL: number;
  cumulative: number;
  segments: Segment[];
};

function keyFor(position: ClosedPosition) {
  return position.transactionIds.join(",");
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  const { format: fmt } = useMarket();
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-popover)]">
      <p className="font-medium">{point.label}</p>
      <ul className="mt-1 space-y-0.5">
        {point.segments.map((seg) => (
          <li key={seg.key} className="flex items-center justify-between gap-3 font-tabular">
            <span className="text-muted-foreground">{seg.symbol}</span>
            <span className={seg.realizedPL >= 0 ? "text-positive" : "text-negative"}>
              {fmt(seg.realizedPL, { signDisplay: "always" })}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-1 border-t border-border pt-1 font-tabular">
        <p>
          Day total:{" "}
          <span className="font-medium">{fmt(point.netPL, { signDisplay: "always" })}</span>
        </p>
        <p className="text-muted-foreground">
          Cumulative: {fmt(point.cumulative, { signDisplay: "always" })}
        </p>
      </div>
    </div>
  );
}

// A day where every trade was small still needs a bar tall enough to see
// and click — otherwise it renders as a near-invisible sliver next to a
// day with a much bigger trade on the same (shared) y-axis scale.
const MIN_BAR_HEIGHT = 36;
// Likewise for an individual trade within a multi-trade day: without a
// floor, a small trade stacked next to a large one on the same day shrinks
// to a sub-pixel line.
const MIN_SEGMENT_HEIGHT = 6;

// Recharts can't natively stack a variable, per-category number of segments,
// so the bar itself is invisible (`fill="transparent"`) and this custom
// shape manually draws one rect per closed position within its pixel rect —
// each individually colored and clickable.
function StackedDayBar({
  x,
  y,
  width,
  height,
  payload,
  selectedKey,
  onSelectKey,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: ChartPoint;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
}) {
  const effectiveHeight = Math.max(height, MIN_BAR_HEIGHT);
  const total = payload.totalAbs || 1;
  const gap = payload.segments.length > 1 ? 1.5 : 0;

  const rects = payload.segments.reduce<{ drawn: number; rects: React.ReactNode[] }>(
    (acc, seg) => {
      const rawHeight = (Math.abs(seg.realizedPL) / total) * effectiveHeight;
      const segHeight = Math.max(rawHeight - gap, MIN_SEGMENT_HEIGHT);
      const segY = y + height - acc.drawn - segHeight;
      const isSelected = selectedKey === seg.key;
      acc.rects.push(
        <rect
          key={seg.key}
          x={x}
          y={segY}
          width={width}
          height={segHeight}
          rx={2}
          fill={seg.realizedPL >= 0 ? "var(--positive)" : "var(--negative)"}
          stroke={isSelected ? "var(--foreground)" : "none"}
          strokeWidth={isSelected ? 2 : 0}
          className="cursor-pointer"
          onClick={() => onSelectKey(isSelected ? null : seg.key)}
        />
      );
      return { drawn: acc.drawn + segHeight + gap, rects: acc.rects };
    },
    { drawn: 0, rects: [] }
  ).rects;

  return <g>{rects}</g>;
}

export function ClosedPositionsChart({
  positions,
  selectedKey,
  onSelectKey,
}: {
  positions: ClosedPosition[];
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
}) {
  const { formatCompact: fmtCompact } = useMarket();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const chartData = React.useMemo(() => {
    const byDay = new Map<string, { label: string; segments: Segment[] }>();
    for (const position of positions) {
      const date = new Date(position.closeDate);
      const dayKey = format(date, "yyyy-MM-dd");
      const segment: Segment = {
        key: keyFor(position),
        symbol: displaySymbol(position.symbol),
        realizedPL: position.realizedPL,
      };
      const existing = byDay.get(dayKey);
      if (existing) existing.segments.push(segment);
      else byDay.set(dayKey, { label: format(date, "d MMM yyyy"), segments: [segment] });
    }
    const sortedDays = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sortedDays.reduce<ChartPoint[]>((acc, [dayKey, day]) => {
      const netPL = day.segments.reduce((sum, s) => sum + s.realizedPL, 0);
      const totalAbs = day.segments.reduce((sum, s) => sum + Math.abs(s.realizedPL), 0);
      const cumulative = (acc[acc.length - 1]?.cumulative ?? 0) + netPL;
      acc.push({ dayKey, label: day.label, totalAbs, netPL, cumulative, segments: day.segments });
      return acc;
    }, []);
  }, [positions]);

  function renderChart(heightClassName: string) {
    return (
      <div className={`${heightClassName} w-full [&_.recharts-surface]:outline-none`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            accessibilityLayer={false}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="dayKey"
              tickFormatter={(dayKey) =>
                new Date(dayKey).toLocaleDateString(undefined, { month: "short", day: "numeric" })
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
            />
            <Tooltip content={<ChartTooltip />} cursor={false} />
            <Bar
              dataKey="totalAbs"
              maxBarSize={28}
              shape={(props: object) => (
                <StackedDayBar
                  {...(props as Omit<Parameters<typeof StackedDayBar>[0], "selectedKey" | "onSelectKey">)}
                  selectedKey={selectedKey}
                  onSelectKey={onSelectKey}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <Card className="relative mb-4 shadow-[var(--shadow-card)]">
      {chartData.length > 0 && (
        <FullscreenChartButton label="realized P&L chart" onClick={() => setIsFullscreen(true)} />
      )}
      <CardHeader className="flex-row items-center justify-between pr-11">
        <div>
          <CardTitle>Realized P&amp;L by day</CardTitle>
          <CardDescription>
            Each bar segment is one closed trade — select a segment to filter the table below
          </CardDescription>
        </div>
        {selectedKey && (
          <button
            type="button"
            onClick={() => onSelectKey(null)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </CardHeader>
      <CardContent>{renderChart("h-64")}</CardContent>
      <FullscreenChartDialog
        open={isFullscreen}
        onOpenChange={setIsFullscreen}
        title="Realized P&L by day"
        description="Each bar segment is one closed trade — select a segment to filter the table below"
      >
        {renderChart("h-full")}
      </FullscreenChartDialog>
    </Card>
  );
}
