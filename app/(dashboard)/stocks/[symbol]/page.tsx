import { StockDetailView } from "@/components/stocks/stock-detail-view";

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return <StockDetailView symbol={decodeURIComponent(symbol)} />;
}
