'use client';

import { Star, CheckCircle2, AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import type { Intelligence, Action } from '@/lib/types';

export default function IntelligencePanel({ intelligence, actions }: { intelligence: Intelligence | null; actions: Action[] }) {
  if (!intelligence) return null;
  const { reality_check, high_leverage_plays = [], gaps = [] } = intelligence;
  const actionMap = Object.fromEntries(actions.map(a => [a.id, a]));
  const verdictStyles = {
    realistic:      { color: 'text-emerald-400', label: 'Realistic',     Icon: CheckCircle2 },
    over_capacity:  { color: 'text-red-400',     label: 'Over capacity', Icon: AlertTriangle },
    under_utilized: { color: 'text-sky-400',     label: 'Light week',    Icon: Clock },
    unbalanced:     { color: 'text-amber-300',   label: 'Unbalanced',    Icon: AlertCircle },
  };
  const v = reality_check ? (verdictStyles[reality_check.verdict] || verdictStyles.realistic) : null;
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-sm p-5">
      <div className="text-[10px] tracking-[0.3em] text-neutral-500 mb-4">INTELLIGENCE</div>
      {reality_check && v && (
        <div className="flex items-start gap-3 mb-5 pb-5 border-b border-neutral-800">
          <v.Icon size={16} className={`${v.color} mt-0.5 flex-shrink-0`} />
          <div>
            <div className={`text-sm font-medium ${v.color}`}>{v.label}</div>
            <div className="text-sm text-neutral-300 mt-0.5">{reality_check.note}</div>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star size={12} className="text-amber-300 fill-amber-300" />
            <div className="text-[10px] tracking-[0.2em] text-neutral-500">HIGH-LEVERAGE PLAYS</div>
          </div>
          {high_leverage_plays.length === 0 ? <div className="text-xs text-neutral-600 italic">None flagged</div> : (
            <ul className="space-y-2.5">
              {high_leverage_plays.map((p, i) => {
                const action = actionMap[p.action_id];
                return (
                  <li key={i} className="text-sm">
                    <div className="text-neutral-100 leading-snug">{action ? action.title : <span className="italic text-neutral-500">[not found]</span>}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{p.why}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={12} className="text-amber-300" />
            <div className="text-[10px] tracking-[0.2em] text-neutral-500">GAPS &amp; RISKS</div>
          </div>
          {gaps.length === 0 ? <div className="text-xs text-neutral-600 italic">No gaps flagged</div> : (
            <ul className="space-y-2.5">
              {gaps.map((g, i) => {
                const sevColor = g.severity === 'high' ? 'text-red-400' : g.severity === 'medium' ? 'text-amber-300' : 'text-neutral-400';
                return (
                  <li key={i} className="text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[10px] tracking-wide uppercase ${sevColor}`}>{g.severity}</span>
                      <span className="text-neutral-100 leading-snug">{g.title}</span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">{g.description}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
