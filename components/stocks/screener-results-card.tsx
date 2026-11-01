import { FileBarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenerTable } from "@/components/stocks/screener-table";
import type { ScreenerTable as ScreenerTableData } from "@/lib/screener";

export function ScreenerResultsCard({
  title,
  description,
  table,
  isLoading,
  compareSequential,
}: {
  title: string;
  description: string;
  table: ScreenerTableData | null;
  isLoading: boolean;
  compareSequential?: boolean;
}) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !table || table.rows.length === 0 ? (
          <EmptyState
            icon={FileBarChart}
            title="Not available"
            description="This data isn't available from Screener.in for this stock."
            className="border-none py-6"
          />
        ) : (
          <ScreenerTable table={table} compareSequential={compareSequential} />
        )}
      </CardContent>
    </Card>
  );
}
