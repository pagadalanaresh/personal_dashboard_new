"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { MarketSwitcher } from "@/components/layout/market-switcher";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { usePageAction } from "@/lib/page-action-context";
import { cn } from "@/lib/utils";

// These 4 pages are only reachable on mobile via the "More" list (see
// MobileBottomNav/app/(dashboard)/more) — like a native iOS drill-in, they
// get a "< More" back button instead of leaving you stranded with only the
// bottom tab bar to escape through.
const MORE_HREFS = ["/closed-positions", "/news", "/analytics", "/settings"];

export function Header({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const title = pathname.startsWith("/more")
    ? "More"
    : NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "";
  const showBackToMore = MORE_HREFS.some((href) => pathname.startsWith(href));
  const pageAction = usePageAction();

  // On mobile, each page renders its own large title inline (see
  // PageHeader) that scrolls away with the content — this bar's title
  // only fades in once that's scrolled out of view, the standard iOS
  // large-title → inline-title handoff. Desktop keeps the title shown
  // here at all times (no large title there), so the observer result is
  // irrelevant above the md breakpoint.
  const [compactTitleVisible, setCompactTitleVisible] = React.useState(true);

  React.useEffect(() => {
    const sentinel = document.getElementById("page-title-sentinel");
    if (!sentinel) {
      // No large title on this page (e.g. a drill-in screen) — the
      // compact title is the only one, so it must always show.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompactTitleVisible(true);
      return;
    }
    // Starts hidden: the large title is on-screen until the observer
    // below reports otherwise.
    setCompactTitleVisible(false);
    const observer = new IntersectionObserver(
      ([entry]) => setCompactTitleVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6">
      {showBackToMore && (
        <Link
          href="/more"
          className="-ml-1 flex items-center gap-0.5 text-sm font-medium text-primary md:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
          More
        </Link>
      )}
      <h1
        className={cn(
          "text-base font-semibold tracking-tight transition-opacity duration-150 sm:text-lg md:opacity-100",
          compactTitleVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-2">
        {/* Compact "+" — the mobile equivalent of each page's labeled
            "Add ..." button (which stays as-is on desktop, where there's
            room for it in the page content instead of here). */}
        {pageAction && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={pageAction.label}
            onClick={pageAction.onClick}
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
        <MarketSwitcher compact className="mb-0 w-auto md:hidden" />
        <ThemeToggle />
        {/* Settings and logout now live on the mobile "More" screen — no
            need for this dropdown's duplicate menu there too. */}
        <div className="hidden md:block">
          <UserMenu name={name} email={email} />
        </div>
      </div>
    </header>
  );
}
