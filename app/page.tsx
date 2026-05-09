'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Target, Brain, BarChart3 } from 'lucide-react';
import { getNextWeekKey, shiftWeek, formatWeekRange, getQuarterInfo } from '@/lib/fiscal';
import { storage } from '@/lib/storage';
import { emptyWeek } from '@/lib/types';
import type { WeekData, Action, Meeting } from '@/lib/types';
import CapacityBar from '@/components/CapacityBar';
import IntelligencePanel from '@/components/IntelligencePanel';
import ActionsPanel from '@/components/ActionsPanel';
import MeetingsPanel from '@/components/MeetingsPanel';
import BrainDumpView from '@/components/BrainDumpView';
import HistoryView from '@/components/HistoryView';

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' };

export default function PipelinePlanner() {
  const [activeWeekKey, setActiveWeekKey] = useState(getNextWeekKey());
  const [weekData, setWeekData] = useState<WeekData>(emptyWeek(getNextWeekKey()));
  const [brainDump, setBrainDump] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'plan' | 'dump' | 'history'>('plan');
  const [allWeeks, setAllWeeks] = useState<string[]>([]);
  const [meetingAccount, setMeetingAccount] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let data = emptyWeek(activeWeekKey);
      try {
        const res = await storage.get(`week:${activeWeekKey}`);
        if (res && res.value) data = JSON.parse(res.value);
      } catch {}
      if (!cancelled) { setWeekData(data); setBrainDump(data.brainDump || ''); }
    })();
    return () => { cancelled = true; };
  }, [activeWeekKey, refreshKey]);

  useEffect(() => {
    (async () => {
      try {
        const res = await storage.list('week:');
        if (res && res.keys) {
          const keys = res.keys.map(k => k.replace('week:', '')).sort().reverse();
          setAllWeeks(keys);
        }
      } catch {}
    })();
  }, [weekData.generatedAt, weekData.meetings.length, refreshKey]);

  const persist = async (next: WeekData) => {
    setWeekData(next);
    try { await storage.set(`week:${next.key}`, JSON.stringify(next)); }
    catch (e) { console.error('Storage error', e); }
  };

  const generatePlan = async () => {
    if (!brainDump.trim()) return;
    setGenerating(true); setError(null);
    try {
      const qInfo = getQuarterInfo(activeWeekKey);
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brainDump,
          weekKey: activeWeekKey,
          weekRange: formatWeekRange(activeWeekKey),
          fiscalContext: qInfo ? {
            label: qInfo.label,
            shortLabel: qInfo.shortLabel,
            weekOfQuarter: qInfo.weekOfQuarter,
            totalWeeks: qInfo.totalWeeks,
            weeksRemaining: qInfo.weeksRemaining,
            quarterEnd: qInfo.quarterEnd.toISOString().slice(0, 10),
            phase: qInfo.phase,
            phaseLabel: qInfo.phaseLabel,
          } : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API returned ${res.status}`);
      }

      const parsed = await res.json();
      const actions: Action[] = (parsed.actions || []).map((a: Record<string, unknown>, i: number) => ({
        id: (a.id as string) || `a${i + 1}`,
        title: (a.t as string) || (a.title as string) || '',
        detail: (a.d as string) || (a.detail as string) || '',
        category: (a.c as string) || (a.category as string) || 'admin',
        hours: Number(a.h ?? a.hours) || 1,
        priority: Number(a.p ?? a.priority) || 2,
        account: (a.acct as string) || (a.account as string) || null,
        high_leverage: Boolean(a.hl ?? a.high_leverage),
        completed: false,
        doneAt: null,
      }));

      const rc = parsed.rc || parsed.reality_check;
      const plays = (parsed.plays || parsed.high_leverage_plays || []).map((p: Record<string, unknown>) => ({
        action_id: (p.id as string) || (p.action_id as string),
        why: (p.w as string) || (p.why as string),
      }));
      const gaps = (parsed.gaps || []).map((g: Record<string, unknown>) => ({
        severity: (g.s as string) || (g.severity as string),
        title: (g.t as string) || (g.title as string),
        description: (g.d as string) || (g.description as string),
      }));
      const reality_check = rc ? {
        total_hours: Number(rc.th ?? rc.total_hours),
        selling_hours: Number(rc.sh ?? rc.selling_hours),
        prospecting_hours: Number(rc.ph ?? rc.prospecting_hours),
        internal_hours: Number(rc.ih ?? rc.internal_hours),
        admin_hours: Number(rc.ah ?? rc.admin_hours),
        verdict: (rc.v || rc.verdict) as 'realistic' | 'over_capacity' | 'under_utilized' | 'unbalanced',
        note: (rc.n || rc.note) as string,
      } : null;

      const next: WeekData = {
        ...weekData, key: activeWeekKey, brainDump, actions,
        intelligence: { high_leverage_plays: plays, reality_check, gaps },
        generatedAt: new Date().toISOString(),
        metrics: parsed._metrics || undefined,
      };
      await persist(next);
      setView('plan');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : String(e) || 'Failed to generate plan. Try again.');
    } finally { setGenerating(false); }
  };

  const toggleAction = (id: string) => persist({
    ...weekData,
    actions: weekData.actions.map(a => a.id === id ? { ...a, completed: !a.completed, doneAt: !a.completed ? new Date().toISOString() : null } : a),
  });

  const deleteAction = (id: string) => persist({ ...weekData, actions: weekData.actions.filter(a => a.id !== id) });

  const addManualAction = (action: Omit<Action, 'id' | 'completed' | 'doneAt'>) => {
    persist({ ...weekData, actions: [...weekData.actions, { id: `m${Date.now()}`, ...action, completed: false, doneAt: null }] });
    setShowAddAction(false);
  };

  const logMeeting = (type: Meeting['type']) => {
    persist({ ...weekData, meetings: [{ id: `mt${Date.now()}`, type, account: meetingAccount.trim(), timestamp: new Date().toISOString() }, ...weekData.meetings] });
    setMeetingAccount('');
  };

  const deleteMeeting = (id: string) => persist({ ...weekData, meetings: weekData.meetings.filter(m => m.id !== id) });

  const stats = useMemo(() => {
    const byCat: Record<string, number> = { selling: 0, prospecting: 0, internal: 0, admin: 0 };
    const byCatDone: Record<string, number> = { selling: 0, prospecting: 0, internal: 0, admin: 0 };
    weekData.actions.forEach(a => {
      const cat = byCat[a.category] !== undefined ? a.category : 'admin';
      byCat[cat] += Number(a.hours) || 0;
      if (a.completed) byCatDone[cat] += Number(a.hours) || 0;
    });
    const total = Object.values(byCat).reduce((s, v) => s + v, 0);
    const totalDone = Object.values(byCatDone).reduce((s, v) => s + v, 0);
    const completedCount = weekData.actions.filter(a => a.completed).length;
    const completion = weekData.actions.length ? Math.round((completedCount / weekData.actions.length) * 100) : 0;
    const meetingCounts: Record<string, number> = { new_biz: 0, existing_opp: 0, partner: 0 };
    weekData.meetings.forEach(m => { if (meetingCounts[m.type] !== undefined) meetingCounts[m.type]++; });
    return { byCat, byCatDone, total, totalDone, completedCount, completion, meetingCounts };
  }, [weekData]);

  const hasPlan = weekData.actions.length > 0 || weekData.intelligence;
  const qInfo = useMemo(() => getQuarterInfo(activeWeekKey), [activeWeekKey]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Masthead */}
        <header className="border-b border-neutral-800 pb-6 mb-8">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-[10px] tracking-[0.3em] text-neutral-500">PIPELINE × MEDDPICC</span>
                {qInfo && (
                  <>
                    <span className="text-neutral-700">·</span>
                    <span className={`text-[10px] tracking-[0.25em] font-medium ${qInfo.phaseAccent}`}>
                      {qInfo.label} · WEEK {String(qInfo.weekOfQuarter).padStart(2, '0')} / {qInfo.totalWeeks} · {qInfo.phaseLabel}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-4xl text-neutral-50 leading-none" style={SERIF}>The Week Ahead</h1>
              <div className="text-sm text-neutral-400 mt-2 italic" style={SERIF}>Brain dump on Friday. Execute Mon–Fri. Track everything.</div>
            </div>
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-sm">
              <button onClick={() => setActiveWeekKey(shiftWeek(activeWeekKey, -1))} className="px-3 py-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"><ChevronLeft size={16} /></button>
              <div className="px-3 text-center min-w-[180px]">
                <div className="text-[10px] tracking-[0.2em] text-neutral-500">{activeWeekKey}</div>
                <div className="text-sm font-medium text-neutral-100">{formatWeekRange(activeWeekKey)}</div>
              </div>
              <button onClick={() => setActiveWeekKey(shiftWeek(activeWeekKey, 1))} className="px-3 py-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>

          {qInfo && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-1.5 text-[10px] tracking-[0.2em]">
                <span className="text-neutral-500">{qInfo.label} PROGRESS</span>
                <span className={qInfo.phaseAccent}>{qInfo.weeksRemaining} {qInfo.weeksRemaining === 1 ? 'WEEK' : 'WEEKS'} REMAINING · QE {qInfo.quarterEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="h-0.5 bg-neutral-900 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 flex">
                  <div className="border-r border-neutral-800" style={{ width: `${(4 / qInfo.totalWeeks) * 100}%` }} />
                  <div className="border-r border-neutral-800" style={{ width: `${(5 / qInfo.totalWeeks) * 100}%` }} />
                </div>
                <div className={`h-full ${qInfo.phase === 'close' ? 'bg-red-400' : qInfo.phase === 'execute' ? 'bg-amber-300' : 'bg-emerald-400'} transition-all`} style={{ width: `${qInfo.progress * 100}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[9px] tracking-[0.15em] text-neutral-600">
                <span className={qInfo.phase === 'build' ? qInfo.phaseAccent : ''}>BUILD · W1–4</span>
                <span className={qInfo.phase === 'execute' ? qInfo.phaseAccent : ''}>EXECUTE · W5–9</span>
                <span className={qInfo.phase === 'close' ? qInfo.phaseAccent : ''}>CLOSE · W10–13</span>
              </div>
            </div>
          )}
        </header>

        {/* Tabs */}
        <nav className="flex gap-1 mb-8 border-b border-neutral-800">
          {([
            { id: 'plan' as const, label: 'Plan', Icon: Target },
            { id: 'dump' as const, label: 'Brain Dump', Icon: Brain },
            { id: 'history' as const, label: 'History', Icon: BarChart3 },
          ]).map(tab => {
            const active = view === tab.id;
            return (
              <button key={tab.id} onClick={() => setView(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 -mb-px ${active ? 'text-neutral-50 border-amber-300' : 'text-neutral-500 hover:text-neutral-300 border-transparent'}`}>
                <tab.Icon size={14} /><span className="tracking-wide uppercase text-xs">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Plan */}
        {view === 'plan' && (
          <div className="space-y-6">
            {!hasPlan ? <EmptyState onStart={() => setView('dump')} weekKey={activeWeekKey} /> : (
              <>
                <CapacityBar stats={stats} />
                <IntelligencePanel intelligence={weekData.intelligence} actions={weekData.actions} />
                <ActionsPanel actions={weekData.actions} onToggle={toggleAction} onDelete={deleteAction} onAdd={addManualAction} showAdd={showAddAction} setShowAdd={setShowAddAction} />
              </>
            )}
            <MeetingsPanel meetings={weekData.meetings} counts={stats.meetingCounts} onLog={logMeeting} onDelete={deleteMeeting} accountValue={meetingAccount} setAccountValue={setMeetingAccount} />
          </div>
        )}

        {/* Brain Dump */}
        {view === 'dump' && (
          <BrainDumpView value={brainDump} onChange={setBrainDump} onGenerate={generatePlan} generating={generating} error={error} existingPlan={weekData.actions.length > 0} generatedAt={weekData.generatedAt} weekKey={activeWeekKey} />
        )}

        {/* History */}
        {view === 'history' && (
          <HistoryView allWeeks={allWeeks} currentKey={activeWeekKey} onSelect={(k) => { setActiveWeekKey(k); setView('plan'); }} />
        )}

        <footer className="mt-16 pt-6 border-t border-neutral-900 text-[10px] tracking-[0.2em] text-neutral-600 text-center">
          PRIVATE · LOCAL · ONE PERSON · CISCO FY · MEDDPICC
        </footer>
      </div>
    </div>
  );
}

function EmptyState({ onStart, weekKey }: { onStart: () => void; weekKey: string }) {
  return (
    <div className="border border-dashed border-neutral-800 rounded-sm p-12 text-center">
      <Brain className="mx-auto text-neutral-700 mb-4" size={32} />
      <h2 className="text-2xl text-neutral-100 mb-2" style={SERIF}>No plan yet for {formatWeekRange(weekKey)}</h2>
      <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">Start with a brain dump — every account, every meeting, every loose thread. The plan generates itself.</p>
      <button onClick={onStart} className="inline-flex items-center gap-2 bg-amber-300 text-neutral-950 px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-amber-200 transition-colors">
        <Brain size={14} /> Start brain dump
      </button>
    </div>
  );
}
