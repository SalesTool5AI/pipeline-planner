export interface Action {
  id: string;
  title: string;
  detail: string;
  category: 'selling' | 'prospecting' | 'internal' | 'admin';
  hours: number;
  priority: number;
  account: string | null;
  high_leverage: boolean;
  completed: boolean;
  doneAt: string | null;
}

export interface Meeting {
  id: string;
  type: 'new_biz' | 'existing_opp' | 'partner';
  account: string;
  timestamp: string;
}

export interface HighLeveragePlay {
  action_id: string;
  why: string;
}

export interface Gap {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

export interface RealityCheck {
  total_hours: number;
  selling_hours: number;
  prospecting_hours: number;
  internal_hours: number;
  admin_hours: number;
  verdict: 'realistic' | 'over_capacity' | 'under_utilized' | 'unbalanced';
  note: string;
}

export interface Intelligence {
  high_leverage_plays: HighLeveragePlay[];
  reality_check: RealityCheck | null;
  gaps: Gap[];
}

export interface WeekData {
  key: string;
  brainDump: string;
  actions: Action[];
  intelligence: Intelligence | null;
  meetings: Meeting[];
  generatedAt: string | null;
}

export const emptyWeek = (key: string): WeekData => ({
  key,
  brainDump: '',
  actions: [],
  intelligence: null,
  meetings: [],
  generatedAt: null,
});

export const CATEGORIES = {
  selling:     { label: 'SELLING',  short: 'SELL', cap: 20, accent: 'text-amber-300',   bg: 'bg-amber-300/10',   border: 'border-amber-300/30' },
  prospecting: { label: 'PROSPECT', short: 'PROS', cap: 5,  accent: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  internal:    { label: 'INTERNAL', short: 'INT',  cap: 0,  accent: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/30' },
  admin:       { label: 'ADMIN',    short: 'ADM',  cap: 0,  accent: 'text-neutral-400', bg: 'bg-neutral-400/10', border: 'border-neutral-400/30' },
} as const;

export const MEETING_TYPES = {
  new_biz:      { label: 'New Biz',      accent: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  existing_opp: { label: 'Existing Opp', accent: 'text-amber-300',   bg: 'bg-amber-300/10',   border: 'border-amber-300/30' },
  partner:      { label: 'Partner',      accent: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/30' },
} as const;

export const TOTAL_CAP = 25;
