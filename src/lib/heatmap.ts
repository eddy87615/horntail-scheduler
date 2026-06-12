/* ------------------------------- heatmap --------------------------------- */
export function heatColor(ratio: number): string {
  if (ratio <= 0) return "transparent";
  const stops = [
    [51, 65, 85],
    [217, 119, 6],
    [234, 88, 12],
    [220, 38, 38],
  ];
  const seg = ratio * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const t = seg - i,
    a = stops[i],
    b = stops[i + 1];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
