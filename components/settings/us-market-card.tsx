"use client";

import { Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useUSMarketVisibility } from "@/hooks/use-us-market-visibility";

export function USMarketCard() {
  const [visible, setVisible] = useUSMarketVisibility();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-4.5 w-4.5 text-muted-foreground" />
          US stocks
        </CardTitle>
        <CardDescription>
          Hidden by default — turn this on to show a US option next to India in the
          market switcher.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Show US stocks</p>
            <p className="text-xs text-muted-foreground">
              Adds a US market option to the switcher.
            </p>
          </div>
          <Switch checked={visible} onCheckedChange={setVisible} />
        </div>
      </CardContent>
    </Card>
  );
}
