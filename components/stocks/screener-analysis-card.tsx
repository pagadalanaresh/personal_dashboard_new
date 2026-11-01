import { Check, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ScreenerAnalysis } from "@/lib/screener";

function AnalysisColumn({
  title,
  icon: Icon,
  markIcon: MarkIcon,
  points,
  emptyLabel,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  markIcon: React.ComponentType<{ className?: string }>;
  points: string[];
  emptyLabel: string;
  tone: "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        tone === "positive" ? "border-positive-muted bg-positive-muted/40" : "border-negative-muted bg-negative-muted/40"
      )}
    >
      <h4
        className={cn(
          "mb-3 flex items-center gap-1.5 text-sm font-semibold",
          tone === "positive" ? "text-positive" : "text-negative"
        )}
      >
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      {points.length > 0 ? (
        <ul className="space-y-2.5">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-snug">
              <MarkIcon
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 shrink-0",
                  tone === "positive" ? "text-positive" : "text-negative"
                )}
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

export function ScreenerAnalysisCard({
  analysis,
  isLoading,
}: {
  analysis: ScreenerAnalysis | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>Pros &amp; Cons</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Pros &amp; Cons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <AnalysisColumn
            title="Pros"
            icon={ThumbsUp}
            markIcon={Check}
            points={analysis.pros}
            emptyLabel="No pros flagged."
            tone="positive"
          />
          <AnalysisColumn
            title="Cons"
            icon={ThumbsDown}
            markIcon={X}
            points={analysis.cons}
            emptyLabel="No cons flagged."
            tone="negative"
          />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Machine generated — exercise caution and do your own analysis
        </p>
      </CardContent>
    </Card>
  );
}
