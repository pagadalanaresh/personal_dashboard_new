import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsArticle } from "@/lib/market-data";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function StockNews({
  articles,
  isLoading,
}: {
  articles: NewsArticle[];
  isLoading: boolean;
}) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Latest news</CardTitle>
        <CardDescription>
          Best-effort — sourced from an unofficial API, not always available
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {articles.map((article) => (
              <li key={article.link} className="py-3 first:pt-0 last:pb-0">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {article.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={article.thumbnailUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug hover:underline">{article.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {article.publisher} &middot; {timeAgo(article.publishedAt)}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
