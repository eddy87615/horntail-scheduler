import { pad } from "./date";

export interface BestGroup {
  date: string;
  from: string;
  to: string;
}

/** Collapse the winning cells into contiguous time ranges per date. */
export function groupBest(cells: string[], stepMin: number): BestGroup[] {
  const byDate: Record<string, string[]> = {};
  cells.forEach((k) => {
    const [d, t] = k.split("|");
    (byDate[d] ||= []).push(t);
  });
  const out: BestGroup[] = [];
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toStr = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  Object.keys(byDate)
    .sort()
    .forEach((d) => {
      const times = byDate[d].sort((a, b) => toMin(a) - toMin(b));
      let start = times[0],
        prev = times[0];
      for (let i = 1; i <= times.length; i++) {
        const cur = times[i];
        if (cur && toMin(cur) - toMin(prev) === stepMin) {
          prev = cur;
          continue;
        }
        out.push({ date: d, from: start, to: toStr(toMin(prev) + stepMin) });
        start = cur;
        prev = cur;
      }
    });
  return out;
}
