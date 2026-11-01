"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NAV_ITEMS } from "@/components/layout/nav-items";

export function Header({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const title = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <MobileNav />
      <h1 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
