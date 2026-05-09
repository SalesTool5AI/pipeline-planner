'use client';

import { Sparkles, Briefcase, Handshake, X } from 'lucide-react';
import { MEETING_TYPES } from '@/lib/types';
import { formatTime } from '@/lib/fiscal';
import type { Meeting } from '@/lib/types';

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

const MEETING_ICONS = {
  new_biz: Sparkles,
  existing_opp: Briefcase,
  partner: Handshake,
} as const;

interface MeetingsPanelProps {
  meetings: Meeting[];
  counts: Record<string, number>;
  onLog: (type: Meeting['type']) => void;
  onDelete: (id: string) => void;
  accountValue: string;
  setAccountValue: (v: string) => void;
}

export default function MeetingsPanel({ meetings, counts, onLog, onDelete, accountValue, setAccountValue }: MeetingsPanelProps) {
  return (
    <section className="bg-neutral-900 border border-neutral-800 rounded-sm p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[10px] tracking-[0.3em] text-neutral-500">MEETINGS THIS WEEK</div>
        <div className="text-sm text-neutral-50 font-medium">{meetings.length} <span className="text-neutral-500 font-normal">total</span></div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {(Object.entries(MEETING_TYPES) as [Meeting['type'], typeof MEETING_TYPES[keyof typeof MEETING_TYPES]][]).map(([key, cfg]) => {
          const Icon = MEETING_ICONS[key];
          return (
            <div key={key} className={`${cfg.bg} ${cfg.border} border rounded-sm p-3`}>
              <div className="flex items-center gap-2 mb-1"><Icon size={12} className={cfg.accent} /><div className={`text-[10px] tracking-[0.15em] ${cfg.accent}`}>{cfg.label.toUpperCase()}</div></div>
              <div className="text-2xl font-medium text-neutral-50" style={SERIF}>{counts[key] || 0}</div>
            </div>
          );
        })}
      </div>
      <div className="bg-neutral-950 border border-neutral-800 rounded-sm p-3">
        <div className="text-[10px] tracking-[0.2em] text-neutral-500 mb-2">QUICK LOG</div>
        <input type="text" value={accountValue} onChange={e => setAccountValue(e.target.value)} placeholder="Account or contact (optional)" className="w-full bg-neutral-900 border border-neutral-800 rounded-sm px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-300/50 mb-2" />
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(MEETING_TYPES) as [Meeting['type'], typeof MEETING_TYPES[keyof typeof MEETING_TYPES]][]).map(([key, cfg]) => {
            const Icon = MEETING_ICONS[key];
            return (
              <button key={key} onClick={() => onLog(key)} className={`${cfg.bg} ${cfg.border} border ${cfg.accent} rounded-sm py-2 text-xs hover:brightness-125 transition-all flex items-center justify-center gap-1.5`}>
                <Icon size={12} /> + {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
      {meetings.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] tracking-[0.2em] text-neutral-500 mb-2">RECENT</div>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {meetings.slice(0, 12).map(m => {
              const cfg = MEETING_TYPES[m.type] || MEETING_TYPES.new_biz;
              return (
                <li key={m.id} className="flex items-center gap-3 text-xs py-1.5 group">
                  <span className={`text-[9px] tracking-[0.15em] px-1.5 py-0.5 rounded-sm ${cfg.bg} ${cfg.accent} ${cfg.border} border w-20 text-center`}>{cfg.label.toUpperCase()}</span>
                  <span className="text-neutral-500 w-24 flex-shrink-0">{formatTime(m.timestamp)}</span>
                  <span className="text-neutral-200 flex-1 truncate">{m.account || <span className="text-neutral-600 italic">no account</span>}</span>
                  <button onClick={() => onDelete(m.id)} className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"><X size={12} /></button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
