import { ExternalLink, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScreenerData, ScreenerLink } from "@/lib/screener";

function DocumentSection({ title, links }: { title: string; links: ScreenerLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.slice(0, 8).map((link, i) => (
          <li key={i}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-1.5 text-sm text-foreground/90 hover:text-foreground"
            >
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
              <span className="min-w-0">
                <span className="line-clamp-2 group-hover:underline">{link.label}</span>
                {link.meta && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {link.meta}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConcallsSection({ concalls }: { concalls: ScreenerData["documents"]["concalls"] }) {
  if (concalls.length === 0) return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Concalls
      </h4>
      <ul className="space-y-2">
        {concalls.slice(0, 8).map((concall, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="w-16 shrink-0 font-medium text-foreground/90">{concall.period}</span>
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {concall.links.map((link, j) => (
                <a
                  key={j}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScreenerDocumentsCard({
  documents,
  isLoading,
}: {
  documents: ScreenerData["documents"] | null;
  isLoading: boolean;
}) {
  const hasData =
    !!documents &&
    (documents.announcements.length > 0 ||
      documents.annualReports.length > 0 ||
      documents.creditRatings.length > 0 ||
      documents.concalls.length > 0);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <CardDescription>Announcements, reports, ratings, and concalls</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !hasData || !documents ? (
          <EmptyState
            icon={FileText}
            title="Not available"
            description="Documents aren't available from Screener.in for this stock."
            className="border-none py-6"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DocumentSection title="Announcements" links={documents.announcements} />
            <DocumentSection title="Annual reports" links={documents.annualReports} />
            <DocumentSection title="Credit ratings" links={documents.creditRatings} />
            <ConcallsSection concalls={documents.concalls} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
