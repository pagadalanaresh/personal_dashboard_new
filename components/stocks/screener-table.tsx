import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ScreenerTable as ScreenerTableData } from "@/lib/screener";

function parseNumeric(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[%,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Compares each quarter's value against the one immediately before it —
// there's no "previous period" for the first column, so it's left plain.
function trendFor(values: (string | null)[], index: number): "up" | "down" | null {
  if (index === 0) return null;
  const previous = parseNumeric(values[index - 1]);
  const current = parseNumeric(values[index]);
  if (previous === null || current === null || previous === current) return null;
  return current > previous ? "up" : "down";
}

export function ScreenerTable({
  table,
  compareSequential = false,
}: {
  table: ScreenerTableData;
  compareSequential?: boolean;
}) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-20 bg-card">
          <TableRow>
            <TableHead className="sticky left-0 z-30 border-r border-border bg-card" />
            {table.periods.map((period) => (
              <TableHead key={period} className="whitespace-nowrap px-3 text-right">
                {period}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow
              key={row.label}
              className={cn(
                row.variant === "strong" && "border-t-2 border-t-border",
                row.variant === "sub" && "text-muted-foreground"
              )}
            >
              <TableCell
                className={cn(
                  "sticky left-0 z-10 whitespace-nowrap border-r border-border bg-card px-3",
                  row.variant === "strong" ? "font-semibold" : "font-medium",
                  row.variant === "sub" && "font-normal text-muted-foreground"
                )}
              >
                {row.label}
              </TableCell>
              {row.values.map((value, i) => {
                const trend = compareSequential ? trendFor(row.values, i) : null;
                return (
                  <TableCell
                    key={i}
                    className={cn(
                      "whitespace-nowrap px-3 text-right font-tabular",
                      row.variant === "strong" && "font-semibold"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5",
                        trend === "up" && "text-positive",
                        trend === "down" && "text-negative"
                      )}
                    >
                      {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                      {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                      {value ?? "—"}
                    </span>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
