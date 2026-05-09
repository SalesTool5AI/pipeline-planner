export function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getNextWeekKey(): string {
  const today = new Date();
  const day = today.getDay();
  if (day === 5) today.setDate(today.getDate() + 3);
  else if (day === 6) today.setDate(today.getDate() + 2);
  else if (day === 0) today.setDate(today.getDate() + 1);
  return getISOWeek(today);
}

export function mondayOfISOWeek(weekKey: string): Date {
  const [yearStr, wStr] = weekKey.split('-W');
  const year = Number(yearStr);
  const w = Number(wStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayNum + 1 + (w - 1) * 7);
  return monday;
}

export function shiftWeek(weekKey: string, delta: number): string {
  const monday = mondayOfISOWeek(weekKey);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return getISOWeek(monday);
}

export function formatWeekRange(weekKey: string): string {
  const monday = mondayOfISOWeek(weekKey);
  const friday = new Date(monday);
  friday.setUTCDate(monday.getUTCDate() + 4);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-GB', opts)} – ${friday.toLocaleDateString('en-GB', opts)}`;
}

export function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export const CISCO_FY_QUARTERS = [
  { fy: 25, q: 1, start: '2024-07-28', end: '2024-10-26' },
  { fy: 25, q: 2, start: '2024-10-27', end: '2025-01-25' },
  { fy: 25, q: 3, start: '2025-01-26', end: '2025-04-26' },
  { fy: 25, q: 4, start: '2025-04-27', end: '2025-07-26' },
  { fy: 26, q: 1, start: '2025-07-27', end: '2025-10-25' },
  { fy: 26, q: 2, start: '2025-10-26', end: '2026-01-24' },
  { fy: 26, q: 3, start: '2026-01-25', end: '2026-04-25' },
  { fy: 26, q: 4, start: '2026-04-26', end: '2026-07-25' },
  { fy: 27, q: 1, start: '2026-07-26', end: '2026-10-24' },
  { fy: 27, q: 2, start: '2026-10-25', end: '2027-01-23' },
  { fy: 27, q: 3, start: '2027-01-24', end: '2027-04-24' },
  { fy: 27, q: 4, start: '2027-04-25', end: '2027-07-24' },
];

export interface QuarterInfo {
  fy: number;
  quarter: number;
  weekOfQuarter: number;
  totalWeeks: number;
  weeksRemaining: number;
  quarterStart: Date;
  quarterEnd: Date;
  label: string;
  shortLabel: string;
  progress: number;
  phase: 'build' | 'execute' | 'close';
  phaseLabel: string;
  phaseAccent: string;
}

export function getQuarterInfo(weekKey: string): QuarterInfo | null {
  const monday = mondayOfISOWeek(weekKey);
  const dateStr = monday.toISOString().slice(0, 10);
  for (const q of CISCO_FY_QUARTERS) {
    if (dateStr >= q.start && dateStr <= q.end) {
      const qStart = new Date(q.start + 'T00:00:00Z');
      const qEnd = new Date(q.end + 'T00:00:00Z');
      const totalDays = Math.round((qEnd.getTime() - qStart.getTime()) / 86400000) + 1;
      const totalWeeks = Math.round(totalDays / 7);
      const elapsedDays = Math.round((monday.getTime() - qStart.getTime()) / 86400000);
      const weekOfQuarter = Math.floor(elapsedDays / 7) + 1;
      const weeksRemaining = Math.max(0, totalWeeks - weekOfQuarter);
      let phase: 'build' | 'execute' | 'close';
      let phaseLabel: string;
      let phaseAccent: string;
      if (weekOfQuarter <= 4) { phase = 'build'; phaseLabel = 'BUILD'; phaseAccent = 'text-emerald-400'; }
      else if (weekOfQuarter <= 9) { phase = 'execute'; phaseLabel = 'EXECUTE'; phaseAccent = 'text-amber-300'; }
      else { phase = 'close'; phaseLabel = 'CLOSE'; phaseAccent = 'text-red-400'; }
      return {
        fy: q.fy, quarter: q.q, weekOfQuarter, totalWeeks, weeksRemaining,
        quarterStart: qStart, quarterEnd: qEnd,
        label: `Q${q.q} FY${q.fy}`,
        shortLabel: `Q${q.q}FY${q.fy} W${String(weekOfQuarter).padStart(2, '0')}`,
        progress: Math.min(1, weekOfQuarter / totalWeeks),
        phase, phaseLabel, phaseAccent
      };
    }
  }
  return null;
}
