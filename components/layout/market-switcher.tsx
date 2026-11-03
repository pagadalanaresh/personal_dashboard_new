"use client";

import { useMarket } from "@/lib/market-context";
import { useUSMarketVisibility } from "@/hooks/use-us-market-visibility";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "NSE" as const, flag: "🇮🇳", label: "India" },
  { value: "US" as const, flag: "🇺🇸", label: "US" },
];

export function MarketSwitcher({
  className,
  compact,
}: {
  className?: string;
  // Flag-only pill that fits the nav bar alongside the title and other
  // icon buttons — the full flag+label pill is reserved for contexts
  // with room to spare (e.g. the mobile "More" sheet).
  compact?: boolean;
}) {
  const { market, setMarket } = useMarket();
  const [showUS] = useUSMarketVisibility();

  // Nothing to switch between when US stocks are hidden in Settings
  // (the default) — there's only one market, so no toggle is shown.
  if (!showUS) return null;

  return (
    <div className={cn("mb-4 flex gap-1 rounded-lg bg-muted p-1", className)}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setMarket(option.value)}
          aria-current={market === option.value ? "true" : undefined}
          aria-label={option.label}
          className={cn(
            "rounded-md font-medium transition-colors",
            compact ? "flex h-8 w-8 items-center justify-center text-base" : "flex-1 px-2 py-1.5 text-sm",
            market === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {compact ? option.flag : `${option.flag} ${option.label}`}
        </button>
      ))}
    </div>
  );
}
