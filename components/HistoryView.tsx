'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChartBar as BarChart3, ChevronRight } from 'lucide-react';
import { getQuarterInfo, formatWeekRange } from '@/lib/fiscal';
import { supabase } from '@/lib/supabase';

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

interface HistoryViewProps {
  allWeeks: string[];
  currentKey: string;
  onSelect: (k: string) => void;
}

interface WeekStats {
  total: number;
  done: number;
  newBiz: number;
  opp: number;
  partner: number;
}

export default function HistoryView({ allWeeks, currentKey, onSelect }: HistoryViewProps) {
  const [stats, setStats] = useState<Record<string, WeekStats>>({});
  useEffect(() => {
    let cancelled = false;
    if (allWeeks.length === 0) return;
    (async () => {
      // Load action counts and meeting counts for all weeks in two queries
      const [actionsRes, meetingsRes] = await Promise.all([
        supabase
          .from('week_plans')
          .select('week_key, week_actions(completed)')
          .in('week_key', allWeeks),
        supabase
          .from('week_plans')
          .select('week_key, week_meetings(type)')
          .in('week_key', allWeeks),
      ]);

      if (cancelled) return;

      const out: Record<string, WeekStats> = {};
      for (const k of allWeeks) {
        const planA = actionsRes.data?.find(p => p.week_key === k);
        const planM = meetingsRes.data?.find(p => p.week_key === k);
        const actions = (planA?.week_actions as { completed: boolean }[]) ?? [];
        const meetings = (planM?.week_meetings as { type: string }[]) ?? [];
        out[k] = {
          total: actions.length,
          done: actions.filter(a => a.completed).length,
          newBiz: meetings.filter(m => m.type === 'new_biz').length,
          opp: meetings.filter(m => m.type === 'existing_opp').length,
          partner: meetings.filter(m => m.type === 'partner').length,
        };
      }
      setStats(out);
    })();
    return () => { cancelled = true; };
  }, [allWeeks]);

  const grouped = useMemo(() => {
    const groups: Record<string, { label: string; qInfo: ReturnType<typeof getQuarterInfo>; weeks: string[] }> = {};
    for (const k of allWeeks) {
      const q = getQuarterInfo(k);
      const gk = q ? `FY${q.fy}-Q${q.quarter}` : 'unknown';
      if (!groups[gk]) groups[gk] = { label: q ? q.label : 'Other', qInfo: q, weeks: [] };
      groups[gk].weeks.push(k);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allWeeks]);

  if (allWeeks.length === 0) {
    return (
      <div className="border border-dashed border-neutral-800 rounded-sm p-12 text-center">
        <BarChart3 className="mx-auto text-neutral-700 mb-4" size={32} />
        <div className="text-sm text-neutral-500">No history yet. Generate plans and the record builds itself.</div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {grouped.map(([gk, group]) => {
        const totals = group.weeks.reduce((acc, k) => {
          const s = stats[k] || {} as Partial<WeekStats>;
          acc.done += s.done || 0; acc.total += s.total || 0;
          acc.newBiz += s.newBiz || 0; acc.opp += s.opp || 0; acc.partner += s.partner || 0;
          return acc;
        }, { done: 0, total: 0, newBiz: 0, opp: 0, partner: 0 });
        const totalMtgs = totals.newBiz + totals.opp + totals.partner;
        return (
          <div key={gk} className="bg-neutral-900 border border-neutral-800 rounded-sm">
            <div className="p-5 border-b border-neutral-800 flex items-baseline justify-between flex-wrap gap-3">
              <div>
                <div className={`text-[10px] tracking-[0.3em] ${group.qInfo ? group.qInfo.phaseAccent : 'text-neutral-500'}`}>{group.label.toUpperCase()}</div>
                <div className="text-sm text-neutral-400 mt-1">{group.weeks.length} weeks tracked · {totalMtgs} meetings · {totals.done}/{totals.total} actions done</div>
              </div>
              <div className="flex gap-4 text-xs">
                <Stat label="New biz"  value={totals.newBiz}  accent="text-emerald-400" />
                <Stat label="Existing" value={totals.opp}     accent="text-amber-300" />
                <Stat label="Partner"  value={totals.partner} accent="text-sky-400" />
              </div>
            </div>
            <ul className="divide-y divide-neutral-800">
              {group.weeks.map(k => {
                const s = stats[k] || {} as Partial<WeekStats>;
                const pct = (s.total || 0) ? Math.round(((s.done || 0) / (s.total || 1)) * 100) : 0;
                const wq = getQuarterInfo(k);
                return (
                  <li key={k}>
                    <button onClick={() => onSelect(k)} className={`w-full text-left p-4 hover:bg-neutral-800/50 transition-colors flex items-center gap-4 ${k === currentKey ? 'bg-amber-300/5' : ''}`}>
                      <div className="flex-shrink-0 w-32">
                        <div className="text-[10px] tracking-[0.2em] text-neutral-500">{wq ? `W${String(wq.weekOfQuarter).padStart(2, '0')}/${wq.totalWeeks}` : k}</div>
                        <div className="text-sm text-neutral-100">{formatWeekRange(k)}</div>
                      </div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <Stat label="Done"     value={`${s.done || 0}/${s.total || 0}`} accent="text-amber-300" sub={`${pct}%`} />
                        <Stat label="New biz"  value={s.newBiz || 0}  accent="text-emerald-400" />
                        <Stat label="Existing" value={s.opp || 0}     accent="text-amber-300" />
                        <Stat label="Partner"  value={s.partner || 0} accent="text-sky-400" />
                      </div>
                      <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function Stat({ label, value, accent = 'text-neutral-100', sub }: { label: string; value: string | number; accent?: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.2em] text-neutral-500">{label.toUpperCase()}</div>
      <div className="flex items-baseline gap-1.5">
        <div className={`text-base font-medium ${accent}`} style={SERIF}>{value}</div>
        {sub && <div className="text-[10px] text-neutral-500">{sub}</div>}
      </div>
    </div>
  );
}
