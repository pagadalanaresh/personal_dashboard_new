"use client";

import { useMarket } from "@/lib/market-context";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "NSE" as const, label: "🇮🇳 India" },
  { value: "US" as const, label: "🇺🇸 US" },
];

export function MarketSwitcher() {
  const { market, setMarket } = useMarket();

  return (
    <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setMarket(option.value)}
          aria-current={market === option.value ? "true" : undefined}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
            market === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
