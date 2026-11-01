import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChangeIndicator({
  value,
  formatted,
  className,
  size = "sm",
}: {
  value: number;
  formatted: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const isFlat = Math.abs(value) < 0.005;
  const isPositive = value > 0;
  const Icon = isFlat ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium font-tabular",
        size === "sm" ? "text-sm" : "text-base",
        isFlat
          ? "text-muted-foreground"
          : isPositive
            ? "text-positive"
            : "text-negative",
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      {formatted}
    </span>
  );
}
