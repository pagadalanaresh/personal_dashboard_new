"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { MarketSwitcher } from "@/components/layout/market-switcher";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

// Same 4 destinations that don't fit in the bottom tab bar (see
// MobileBottomNav's PRIMARY_HREFS) — mirrored here as a real grouped list
// screen, iOS Settings-app style, instead of a bottom sheet.
const MORE_HREFS = ["/closed-positions", "/news", "/analytics", "/settings"];

const ICON_BG: Record<string, string> = {
  "/closed-positions": "bg-muted-foreground/20 text-foreground",
  "/news": "bg-accent text-accent-foreground",
  "/analytics": "bg-positive-muted text-positive",
  "/settings": "bg-muted-foreground/20 text-foreground",
};

export default function MorePage() {
  const router = useRouter();
  const items = NAV_ITEMS.filter((item) => MORE_HREFS.includes(item.href));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <PageHeader title="More" />

      <MarketSwitcher className="mx-0 mb-4" />

      <div className="overflow-hidden rounded-xl border border-border">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 active:bg-muted",
                index !== 0 && "border-t border-border"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  ICON_BG[item.href]
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-[15px]">{item.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3.5 text-destructive active:bg-destructive/10"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-destructive/10">
          <LogOut className="h-4 w-4" />
        </span>
        <span className="text-[15px] font-medium">Log out</span>
      </button>
    </div>
  );
}
