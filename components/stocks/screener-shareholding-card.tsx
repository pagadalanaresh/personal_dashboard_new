import { PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScreenerTable } from "@/components/stocks/screener-table";
import type { ScreenerData } from "@/lib/screener";

export function ScreenerShareholdingCard({
  shareholding,
  isLoading,
}: {
  shareholding: ScreenerData["shareholding"] | null;
  isLoading: boolean;
}) {
  const quarterly = shareholding?.quarterly ?? null;
  const yearly = shareholding?.yearly ?? null;
  const hasData = (quarterly && quarterly.rows.length > 0) || (yearly && yearly.rows.length > 0);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Shareholding Pattern</CardTitle>
        <CardDescription>Numbers in percentages</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !hasData ? (
          <EmptyState
            icon={PieChart}
            title="Not available"
            description="Shareholding data isn't available from Screener.in for this stock."
            className="border-none py-6"
          />
        ) : (
          <Tabs defaultValue="quarterly">
            <TabsList className="mb-4">
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
            <TabsContent value="quarterly">
              {quarterly && quarterly.rows.length > 0 ? (
                <ScreenerTable table={quarterly} />
              ) : (
                <p className="text-sm text-muted-foreground">No quarterly data available.</p>
              )}
            </TabsContent>
            <TabsContent value="yearly">
              {yearly && yearly.rows.length > 0 ? (
                <ScreenerTable table={yearly} />
              ) : (
                <p className="text-sm text-muted-foreground">No yearly data available.</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
