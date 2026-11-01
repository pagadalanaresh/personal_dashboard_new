import "server-only";
import { prisma } from "@/lib/prisma";

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  holdingsCount: number;
  watchlistCount: number;
  transactionsCount: number;
};

export async function listUsers(): Promise<AdminUserSummary[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { holdings: true, watchlist: true, transactions: true } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    holdingsCount: user._count.holdings,
    watchlistCount: user._count.watchlist,
    transactionsCount: user._count.transactions,
  }));
}
