"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";

// iOS tab bar: at most ~5 destinations, thumb-reachable. The 4 most-used
// sections get a direct tab; everything else lives behind "More" — a full
// screen (see app/(dashboard)/more), not a sheet, matching how iOS apps
// (App Store, Settings) implement their own "More" tab.
const PRIMARY_HREFS = ["/dashboard", "/portfolio", "/watchlist", "/transactions"];

export function MobileBottomNav() {
  const pathname = usePathname();

  const primaryItems = NAV_ITEMS.filter((item) => PRIMARY_HREFS.includes(item.href));
  const moreItems = NAV_ITEMS.filter((item) => !PRIMARY_HREFS.includes(item.href));
  const isMoreActive =
    pathname.startsWith("/more") || moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid min-h-16 grid-cols-5 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {primaryItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[0.68rem] font-medium",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-[26px] w-[26px]" strokeWidth={isActive ? 2.3 : 2} />
            {item.label}
          </Link>
        );
      })}

      <Link
        href="/more"
        aria-current={isMoreActive ? "page" : undefined}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 py-2 text-[0.68rem] font-medium",
          isMoreActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Menu className="h-[26px] w-[26px]" strokeWidth={isMoreActive ? 2.3 : 2} />
        More
      </Link>
    </nav>
  );
}
