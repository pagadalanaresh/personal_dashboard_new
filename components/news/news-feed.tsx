"use client";

import Link from "next/link";
import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displaySymbol, stockHref } from "@/lib/utils";
import type { AggregatedNewsArticle } from "@/hooks/use-all-stock-news";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NewsList({ articles }: { articles: AggregatedNewsArticle[] }) {
  if (articles.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No recent news found"
        description="We couldn't find reliably-tagged news for this market right now. Try again later."
        className="border-none py-6"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {articles.map((article) => (
        <li key={`${article.symbol}-${article.link}`} className="py-3 first:pt-0 last:pb-0">
          <div className="flex gap-3">
            {article.thumbnailUrl && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.thumbnailUrl}
                  alt=""
                  className="h-14 w-14 rounded-md object-cover"
                />
              </a>
            )}
            <div className="min-w-0 flex-1">
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium leading-snug outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {article.title}
              </a>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Link
                  href={stockHref(article.symbol)}
                  className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground hover:bg-muted/70"
                >
                  {displaySymbol(article.symbol)}
                </Link>
                <span>
                  {article.publisher} &middot; {timeAgo(article.publishedAt)}
                </span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NewsFeed({
  articles,
  isLoading,
}: {
  articles: AggregatedNewsArticle[];
  isLoading: boolean;
}) {
  const indiaArticles = articles.filter((article) => article.market === "IN");
  const usArticles = articles.filter((article) => article.market === "US");

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All ({articles.length})</TabsTrigger>
        <TabsTrigger value="in">India ({indiaArticles.length})</TabsTrigger>
        <TabsTrigger value="us">US ({usArticles.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <NewsList articles={articles} />
      </TabsContent>
      <TabsContent value="in">
        <NewsList articles={indiaArticles} />
      </TabsContent>
      <TabsContent value="us">
        <NewsList articles={usArticles} />
      </TabsContent>
    </Tabs>
  );
}
