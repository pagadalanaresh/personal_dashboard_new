import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/validations";

export function PositionBadge({ position }: { position: Position }) {
  const isLong = position === "LONG";
  return (
    <Badge
      variant="outline"
      className={cn(isLong ? "border-positive/30 text-positive" : "border-negative/30 text-negative")}
    >
      {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isLong ? "Long" : "Short"}
    </Badge>
  );
}
