import { IndexDetailView } from "@/components/indexes/index-detail-view";

export default async function IndexDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return <IndexDetailView symbol={decodeURIComponent(symbol)} />;
}
