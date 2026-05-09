'use client';

import { CATEGORIES, TOTAL_CAP } from '@/lib/types';

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

interface Stats {
  byCat: Record<string, number>;
  byCatDone: Record<string, number>;
  total: number;
}

export default function CapacityBar({ stats }: { stats: Stats }) {
  const overall = stats.total / TOTAL_CAP;
  const overallPct = Math.min(100, overall * 100);
  const verdict = stats.total > TOTAL_CAP ? 'over' : stats.total < 18 ? 'light' : 'on track';
  const verdictColor = verdict === 'over' ? 'text-red-400' : verdict === 'light' ? 'text-sky-400' : 'text-emerald-400';
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-sm p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[10px] tracking-[0.3em] text-neutral-500">CAPACITY</div>
        <div className="text-xs">
          <span className="text-neutral-50 font-medium">{stats.total.toFixed(1)}h</span>
          <span className="text-neutral-500"> / {TOTAL_CAP}h budget</span>
          <span className={`ml-3 ${verdictColor} uppercase tracking-wide text-[10px]`}>{verdict}</span>
        </div>
      </div>
      <div className="h-1 bg-neutral-800 rounded-full overflow-hidden mb-5">
        <div className={`h-full ${overall > 1 ? 'bg-red-400' : 'bg-amber-300'}`} style={{ width: `${overallPct}%` }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CategoryStat label="Selling"     hours={stats.byCat.selling}     done={stats.byCatDone.selling}     cap={20} cat="selling" />
        <CategoryStat label="Prospecting" hours={stats.byCat.prospecting} done={stats.byCatDone.prospecting} cap={5}  cat="prospecting" />
        <CategoryStat label="Internal"    hours={stats.byCat.internal}    done={stats.byCatDone.internal}    cap={null} cat="internal" />
        <CategoryStat label="Admin"       hours={stats.byCat.admin}       done={stats.byCatDone.admin}       cap={null} cat="admin" />
      </div>
    </section>
  );
}

function CategoryStat({ label, hours, done, cap, cat }: { label: string; hours: number; done: number; cap: number | null; cat: string }) {
  const c = CATEGORIES[cat as keyof typeof CATEGORIES];
  const pct = cap ? Math.min(100, (hours / cap) * 100) : 0;
  const over = cap && hours > cap;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className={`text-[10px] tracking-[0.2em] ${c.accent}`}>{label.toUpperCase()}</div>
        <div className="text-xs text-neutral-300">{hours.toFixed(1)}{cap ? `/${cap}` : ''}h</div>
      </div>
      {cap && (
        <div className="h-0.5 bg-neutral-800 rounded-full overflow-hidden">
          <div className={`h-full ${over ? 'bg-red-400' : c.accent.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="text-[10px] text-neutral-600 mt-1">{done.toFixed(1)}h done</div>
    </div>
  );
}
