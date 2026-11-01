import type { HistoryPoint } from "@/lib/market-data";

export type TrendLabel = "Bullish" | "Bearish" | "Neutral";
export type TrendlineDirection = "Uptrending" | "Downtrending";

export type TrendAnalysis = {
  label: TrendLabel;
  // 0-100, with 50 as the neutral midpoint — higher is more bullish.
  score: number;
  momentumPercent: number;
  consistencyPercent: number;
  aboveShortSma: boolean;
  shortAboveLong: boolean;
  // Least-squares trendline fit over the window (slope is price change per
  // data point, same units as the input values).
  trendlineSlope: number;
  trendlineDirection: TrendlineDirection;
};

const MIN_POINTS = 5;
// A move of this size (or more) over the window counts as a "fully" strong
// move for scoring purposes — momentum/trendline beyond this saturate at +/-1.
const MOMENTUM_SATURATION_PERCENT = 10;

function average(values: number[]) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// Least-squares linear regression (y = slope*x + intercept), x = 0..n-1 —
// the same fit as numpy's `polyfit(x, y, 1)`. A fitted trendline is less
// sensitive to a single noisy point at either end of the window than
// comparing the raw first/last price directly (which is what the
// momentum factor below does).
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let x = 0; x < n; x++) {
    const y = values[x];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Derives a simple directional trend read from a price history series,
// combining four equally-weighted signals into a signed -1..+1 composite
// (so a strong *bearish* reading pulls the score down, not just a weak
// bullish one), then recenters on 50 (neutral) for display:
//  - momentum: raw % change from the first to the last point in the window
//  - trendline: % move implied by a least-squares fit across the whole
//    window — a noise-resistant read of the same thing momentum measures
//  - moving averages: is price above its short-term average, and is the
//    short-term average above the long-term average
//  - consistency: what % of day-to-day moves agreed with the overall
//    direction — a steady climb/slide scores higher than one that
//    whipsaws to the same endpoint
export function analyzeTrend(points: HistoryPoint[]): TrendAnalysis | null {
  if (points.length < MIN_POINTS) return null;

  const values = points.map((p) => p.value);
  const first = values[0];
  const last = values[values.length - 1];
  const momentumPercent = first === 0 ? 0 : ((last - first) / first) * 100;

  const { slope } = linearRegression(values);
  const meanPrice = average(values);
  // % move the fitted trendline implies end-to-end across the window.
  const trendlinePercent =
    meanPrice === 0 ? 0 : (slope * (values.length - 1)) / meanPrice * 100;
  const trendlineDirection: TrendlineDirection = slope >= 0 ? "Uptrending" : "Downtrending";

  const shortWindow = Math.max(2, Math.round(values.length / 4));
  const longWindow = Math.max(shortWindow + 1, Math.round(values.length / 2));
  const shortSma = average(values.slice(-shortWindow));
  const longSma = average(values.slice(-longWindow));
  const aboveShortSma = last >= shortSma;
  const shortAboveLong = shortSma >= longSma;

  const direction = momentumPercent >= 0 ? 1 : -1;
  let agreeing = 0;
  let decided = 0;
  for (let i = 1; i < values.length; i++) {
    const step = values[i] - values[i - 1];
    if (step === 0) continue;
    decided++;
    if (Math.sign(step) === direction) agreeing++;
  }
  const consistencyPercent = decided === 0 ? 0 : (agreeing / decided) * 100;

  const momentumComponent = clamp(momentumPercent / MOMENTUM_SATURATION_PERCENT, -1, 1);
  const trendlineComponent = clamp(trendlinePercent / MOMENTUM_SATURATION_PERCENT, -1, 1);
  const maComponent = ((aboveShortSma ? 1 : -1) + (shortAboveLong ? 1 : -1)) / 2;
  const consistencyComponent = direction * (consistencyPercent / 100);

  const composite =
    momentumComponent * 0.25 +
    trendlineComponent * 0.25 +
    maComponent * 0.25 +
    consistencyComponent * 0.25;
  const score = Math.round(clamp(50 + composite * 50, 0, 100));

  const label: TrendLabel = score >= 60 ? "Bullish" : score <= 40 ? "Bearish" : "Neutral";

  return {
    label,
    score,
    momentumPercent,
    consistencyPercent,
    aboveShortSma,
    shortAboveLong,
    trendlineSlope: slope,
    trendlineDirection,
  };
}
