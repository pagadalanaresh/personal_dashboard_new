"use client";

import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { AllocationBreakdown } from "@/components/analytics/allocation-breakdown";
import { SectorAllocationChart } from "@/components/analytics/sector-allocation-chart";
import { PerformerCards } from "@/components/analytics/performer-cards";
import { ConcentrationCard } from "@/components/analytics/concentration-card";
import { useHoldings } from "@/hooks/use-holdings";

export default function AnalyticsPage() {
  const { holdings, isLoading } = useHoldings();
  const hasHoldings = holdings.length > 0;

  return (
    <div>
      <PageHeader description="Deeper performance breakdowns, concentration insights, and best/worst performers." />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !hasHoldings ? (
        <EmptyState
          icon={BarChart3}
          title="Analytics will fill in once you have holdings"
          description="Add a position on the Portfolio page to see performance, allocation, and concentration insights here."
        />
      ) : (
        <Tabs defaultValue="performance">
          <TabsList className="mb-4">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
            <TabsTrigger value="concentration">Concentration</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <PerformanceChart hasHoldings={hasHoldings} refreshKey={0} />
          </TabsContent>

          <TabsContent value="allocation" className="grid gap-6 lg:grid-cols-2">
            <SectorAllocationChart holdings={holdings} />
            <AllocationBreakdown holdings={holdings} />
          </TabsContent>

          <TabsContent value="concentration" className="space-y-4">
            <PerformerCards holdings={holdings} />
            <ConcentrationCard holdings={holdings} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
