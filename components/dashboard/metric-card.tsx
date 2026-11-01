import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangeIndicator } from "@/components/shared/change-indicator";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  changeValue,
  changeFormatted,
  icon: Icon,
  isLoading,
  className,
}: {
  title: string;
  value: string;
  changeValue?: number;
  changeFormatted?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
}) {
  if (isLoading) {
    return (
      <Card className={cn("shadow-[var(--shadow-card)]", className)}>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="font-tabular text-2xl font-semibold tracking-tight">{value}</p>
          {changeFormatted && changeValue !== undefined && (
            <ChangeIndicator value={changeValue} formatted={changeFormatted} />
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Icon className="h-4.5 w-4.5 text-accent-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
