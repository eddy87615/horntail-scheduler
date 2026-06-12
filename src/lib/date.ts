/* ----------------------------- date helpers ------------------------------ */
export const WD = ["日", "一", "二", "三", "四", "五", "六"];

export const pad = (n: number) => String(n).padStart(2, "0");

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const fmtDateShort = (s: string) => {
  const d = parseISO(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

export const fmtWeekday = (s: string) => WD[parseISO(s).getDay()];

// time strings may exceed 24:00 for overnight sessions (e.g. "25:30" = 01:30 next day)
export function buildSlots(startH: number, endH: number, stepMin: number): string[] {
  const out: string[] = [];
  for (let m = startH * 60; m < endH * 60; m += stepMin)
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

export function timeLabel(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return h >= 24 ? `${pad(h - 24)}:${pad(m)}⁺` : t;
}

export const cellKey = (date: string, time: string) => `${date}|${time}`;
