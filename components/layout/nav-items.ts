import {
  LayoutDashboard,
  Wallet,
  Archive,
  Star,
  Receipt,
  BarChart3,
  Newspaper,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/closed-positions", label: "Closed Positions", icon: Archive },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
