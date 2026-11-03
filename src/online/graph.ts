// The rating graph: a pure function from a rating series to the points and path of a small SVG line chart.
export interface GraphPoint { x: number; y: number; rating: number }
export interface Graph { points: GraphPoint[]; min: number; max: number; path: string }
/** `ratings` oldest first. The chart is w x h with a margin; the vertical range is padded so a flat line sits mid-chart. */
export function ratingGraph(ratings: number[], w = 300, h = 120, pad = 10): Graph {
  if (!ratings.length) return { points: [], min: 0, max: 0, path: "" };
  const lo = Math.min(...ratings), hi = Math.max(...ratings), span = Math.max(hi - lo, 40), mid = (hi + lo) / 2;
  const min = Math.floor(mid - span / 2 - span * .1), max = Math.ceil(mid + span / 2 + span * .1);
  const points = ratings.map((rating, i) => ({
    x: ratings.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (ratings.length - 1),
    y: pad + ((max - rating) * (h - 2 * pad)) / (max - min), rating }));
  return { points, min, max, path: points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") };
}
