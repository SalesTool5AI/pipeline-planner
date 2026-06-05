import { supabase } from '@/lib/supabase';
import type { WeekData, Action, Meeting, Intelligence } from '@/lib/types';
import { emptyWeek } from '@/lib/types';

// ─── helpers ────────────────────────────────────────────────────────────────

type DbAction = {
  id: string;
  client_id: string;
  title: string;
  detail: string;
  category: string;
  hours: number;
  priority: number;
  account: string | null;
  high_leverage: boolean;
  completed: boolean;
  done_at: string | null;
};

type DbMeeting = {
  id: string;
  type: string;
  account: string;
  logged_at: string;
};

type DbIntelligence = {
  high_leverage_plays: Intelligence['high_leverage_plays'];
  reality_check: Intelligence['reality_check'];
  gaps: Intelligence['gaps'];
};

function dbActionsToActions(rows: DbAction[]): Action[] {
  return rows.map(r => ({
    id: r.client_id || r.id,
    title: r.title,
    detail: r.detail,
    category: r.category as Action['category'],
    hours: Number(r.hours),
    priority: r.priority,
    account: r.account,
    high_leverage: r.high_leverage,
    completed: r.completed,
    doneAt: r.done_at,
  }));
}

function dbMeetingsToMeetings(rows: DbMeeting[]): Meeting[] {
  return rows.map(r => ({
    id: r.id,
    type: r.type as Meeting['type'],
    account: r.account,
    timestamp: r.logged_at,
  }));
}

// ─── public API ─────────────────────────────────────────────────────────────

export const storage = {
  async getWeek(weekKey: string): Promise<WeekData> {
    const { data: plan, error } = await supabase
      .from('week_plans')
      .select('id, week_key, brain_dump, generated_at, metrics')
      .eq('week_key', weekKey)
      .maybeSingle();

    if (error) throw error;
    if (!plan) return emptyWeek(weekKey);

    const [actionsRes, meetingsRes, intelligenceRes] = await Promise.all([
      supabase
        .from('week_actions')
        .select('id, client_id, title, detail, category, hours, priority, account, high_leverage, completed, done_at')
        .eq('week_plan_id', plan.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('week_meetings')
        .select('id, type, account, logged_at')
        .eq('week_plan_id', plan.id)
        .order('logged_at', { ascending: false }),
      supabase
        .from('week_intelligence')
        .select('high_leverage_plays, reality_check, gaps')
        .eq('week_plan_id', plan.id)
        .maybeSingle(),
    ]);

    return {
      key: plan.week_key,
      brainDump: plan.brain_dump,
      generatedAt: plan.generated_at,
      metrics: plan.metrics ?? undefined,
      actions: actionsRes.data ? dbActionsToActions(actionsRes.data as DbAction[]) : [],
      meetings: meetingsRes.data ? dbMeetingsToMeetings(meetingsRes.data as DbMeeting[]) : [],
      intelligence: intelligenceRes.data
        ? {
            high_leverage_plays: (intelligenceRes.data as DbIntelligence).high_leverage_plays ?? [],
            reality_check: (intelligenceRes.data as DbIntelligence).reality_check ?? null,
            gaps: (intelligenceRes.data as DbIntelligence).gaps ?? [],
          }
        : null,
    };
  },

  async upsertWeekPlan(weekKey: string, brainDump: string, generatedAt: string | null, metrics?: WeekData['metrics']): Promise<string> {
    const { data, error } = await supabase
      .from('week_plans')
      .upsert(
        { week_key: weekKey, brain_dump: brainDump, generated_at: generatedAt, metrics: metrics ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,week_key' }
      )
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async replaceActions(weekPlanId: string, actions: Action[]): Promise<void> {
    const { error: delErr } = await supabase
      .from('week_actions')
      .delete()
      .eq('week_plan_id', weekPlanId);
    if (delErr) throw delErr;

    if (actions.length === 0) return;

    const rows = actions.map(a => ({
      week_plan_id: weekPlanId,
      client_id: a.id,
      title: a.title,
      detail: a.detail,
      category: a.category,
      hours: a.hours,
      priority: a.priority,
      account: a.account ?? null,
      high_leverage: a.high_leverage,
      completed: a.completed,
      done_at: a.doneAt ?? null,
    }));

    const { error } = await supabase.from('week_actions').insert(rows);
    if (error) throw error;
  },

  async upsertIntelligence(weekPlanId: string, intelligence: Intelligence): Promise<void> {
    const { error } = await supabase
      .from('week_intelligence')
      .upsert(
        {
          week_plan_id: weekPlanId,
          high_leverage_plays: intelligence.high_leverage_plays,
          reality_check: intelligence.reality_check,
          gaps: intelligence.gaps,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'week_plan_id' }
      );
    if (error) throw error;
  },

  async addMeeting(weekPlanId: string, meeting: Meeting): Promise<Meeting> {
    const { data, error } = await supabase
      .from('week_meetings')
      .insert({
        id: meeting.id,
        week_plan_id: weekPlanId,
        type: meeting.type,
        account: meeting.account,
        logged_at: meeting.timestamp,
      })
      .select('id, type, account, logged_at')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      type: data.type as Meeting['type'],
      account: data.account,
      timestamp: data.logged_at,
    };
  },

  async deleteMeeting(id: string): Promise<void> {
    const { error } = await supabase.from('week_meetings').delete().eq('id', id);
    if (error) throw error;
  },

  async listWeekKeys(): Promise<string[]> {
    const { data, error } = await supabase
      .from('week_plans')
      .select('week_key')
      .order('week_key', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => r.week_key);
  },

  async saveWeek(weekData: WeekData): Promise<void> {
    const planId = await storage.upsertWeekPlan(weekData.key, weekData.brainDump, weekData.generatedAt ?? null, weekData.metrics);
    await storage.replaceActions(planId, weekData.actions);
    if (weekData.intelligence) {
      await storage.upsertIntelligence(planId, weekData.intelligence);
    }
  },
};
