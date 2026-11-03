export function PageHeader({
  title,
  description,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {/* Large title: mobile only (Header's sticky bar carries the title
          on desktop, which has no large title). This scrolls away with
          the content — Header watches this exact element via
          IntersectionObserver and fades its own compact title in once
          it's gone, the iOS large-title → inline-title handoff used by
          Stocks/Settings/App Store. */}
      {title && (
        <h1
          id="page-title-sentinel"
          className="mb-4 text-3xl font-extrabold tracking-tight md:hidden"
        >
          {title}
        </h1>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
