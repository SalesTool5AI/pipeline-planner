'use client';

import { Loader2, AlertTriangle, Zap, RefreshCw } from 'lucide-react';
import { getQuarterInfo, formatWeekRange } from '@/lib/fiscal';

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

interface BrainDumpViewProps {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
  existingPlan: boolean;
  generatedAt: string | null;
  weekKey: string;
}

export default function BrainDumpView({ value, onChange, onGenerate, generating, error, existingPlan, generatedAt, weekKey }: BrainDumpViewProps) {
  const qInfo = getQuarterInfo(weekKey);
  return (
    <section className="space-y-5">
      <div className="bg-neutral-900 border border-neutral-800 rounded-sm p-6">
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-[10px] tracking-[0.3em] text-neutral-500">
              FRIDAY DUMP{qInfo && <span className={`ml-2 ${qInfo.phaseAccent}`}>· {qInfo.shortLabel} · {qInfo.phaseLabel}</span>}
            </div>
            <h2 className="text-xl text-neutral-50 mt-1" style={SERIF}>What&apos;s on your mind for {formatWeekRange(weekKey)}?</h2>
            {qInfo && <p className="text-xs text-neutral-500 mt-1">{qInfo.weeksRemaining} {qInfo.weeksRemaining === 1 ? 'week' : 'weeks'} left in {qInfo.label}. The plan will be tuned to <span className={qInfo.phaseAccent}>{qInfo.phaseLabel}</span> phase rhythm.</p>}
          </div>
          {existingPlan && generatedAt && (
            <div className="text-[10px] text-neutral-500 text-right">
              <div>PLAN GENERATED</div>
              <div className="text-neutral-300 mt-0.5">{new Date(generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </div>
          )}
        </div>
        <p className="text-sm text-neutral-400 mb-4 italic" style={SERIF}>Every account. Every loose thread. Every meeting on the books. Don&apos;t structure it — that&apos;s the job of the model.</p>
        <textarea
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={`e.g.\n• SSE plc — 50GB licence renewal Sept/Oct, ITSI underutilised, expand play needed.\n• JLR — Ashish CISO + Tony Battle CIO. TDIR + SAP security angle post-breach.\n• TikTok EMEA — Project Clover, NCC Group angle. Cold list ready, need sequence.\n• Splunk Core User cert — need to finish this week.\n• Forecast call Tue, manager 1:1 Wed.\n• 5 net-new contacts to research at TUI...`}
          rows={14}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-sm px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-700 focus:outline-none focus:border-amber-300/50 leading-relaxed"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
        />
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-neutral-500">{value.length > 0 ? `${value.split(/\s+/).filter(Boolean).length} words` : 'Empty'}</div>
          <button onClick={onGenerate} disabled={generating || !value.trim()} className="inline-flex items-center gap-2 bg-amber-300 text-neutral-950 px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-amber-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            {generating ? <><Loader2 size={14} className="animate-spin" />Generating plan…</> : existingPlan ? <><RefreshCw size={14} />Regenerate plan</> : <><Zap size={14} />Generate plan</>}
          </button>
        </div>
        {error && (
          <div className="mt-4 bg-red-950/30 border border-red-900 rounded-sm p-3 text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <div><div className="font-medium">Generation failed</div><div className="text-xs text-red-400 mt-0.5">{error}</div></div>
          </div>
        )}
        {existingPlan && (
          <div className="mt-4 text-xs text-amber-300/70 border border-amber-300/20 bg-amber-300/5 rounded-sm p-3">
            <strong className="text-amber-300">Note:</strong> a plan already exists for this week. Regenerating will overwrite actions and intelligence (meeting log preserved).
          </div>
        )}
      </div>
    </section>
  );
}
