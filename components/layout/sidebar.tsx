import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/layout/nav-links";
import { MarketSwitcher } from "@/components/layout/market-switcher";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <div className="mb-8 px-2">
        <Logo />
      </div>
      <MarketSwitcher />
      <NavLinks />
    </aside>
  );
}
