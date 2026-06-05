/*
# Pipeline Planner Schema — Multi-user with auth

## Summary
Creates all tables needed to persist weekly sales planning data per authenticated user.
Replaces the existing localStorage-based storage with a Supabase-backed persistent store.

## New Tables

### week_plans
Stores one record per user per ISO week. Contains the brain dump text and metadata.
- id (uuid, PK)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- week_key (text) — ISO week key e.g. "2026-W23"
- brain_dump (text) — raw brain dump text
- generated_at (timestamptz) — when the plan was last generated
- metrics (jsonb) — generation metrics (tokens, model, latency)
- created_at / updated_at (timestamptz)
- UNIQUE constraint on (user_id, week_key) — one plan per user per week

### week_actions
Individual actions within a weekly plan.
- id (uuid, PK)
- week_plan_id (uuid, FK to week_plans)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- client_id (text) — the short ID assigned by the client ("a1", "m1234…")
- title, detail, category, hours, priority, account, high_leverage
- completed (boolean)
- done_at (timestamptz)
- created_at / updated_at

### week_meetings
Meeting log entries for a week.
- id (uuid, PK)
- week_plan_id (uuid, FK to week_plans)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- type (text) — new_biz | existing_opp | partner
- account (text)
- logged_at (timestamptz)
- created_at

### week_intelligence
Stores the AI-generated intelligence blob (plays, gaps, reality check) for a plan.
- id (uuid, PK)
- week_plan_id (uuid, FK to week_plans, UNIQUE — one intelligence per plan)
- user_id (uuid, FK to auth.users, defaults to auth.uid())
- high_leverage_plays (jsonb)
- reality_check (jsonb)
- gaps (jsonb)
- created_at / updated_at

## Security
- RLS enabled on all 4 tables
- 4 separate policies per table (SELECT / INSERT / UPDATE / DELETE)
- All scoped to auth.uid() = user_id
- user_id defaults to auth.uid() so inserts omitting user_id still pass
*/

-- ────────────────────────────────────────────────
-- week_plans
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS week_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key     text NOT NULL,
  brain_dump   text NOT NULL DEFAULT '',
  generated_at timestamptz,
  metrics      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_key)
);

ALTER TABLE week_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_week_plans" ON week_plans;
CREATE POLICY "select_own_week_plans" ON week_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_week_plans" ON week_plans;
CREATE POLICY "insert_own_week_plans" ON week_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_week_plans" ON week_plans;
CREATE POLICY "update_own_week_plans" ON week_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_week_plans" ON week_plans;
CREATE POLICY "delete_own_week_plans" ON week_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS week_plans_user_week_idx ON week_plans (user_id, week_key);

-- ────────────────────────────────────────────────
-- week_actions
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS week_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id   uuid NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id      text NOT NULL DEFAULT '',
  title          text NOT NULL DEFAULT '',
  detail         text NOT NULL DEFAULT '',
  category       text NOT NULL DEFAULT 'admin',
  hours          numeric NOT NULL DEFAULT 1,
  priority       integer NOT NULL DEFAULT 2,
  account        text,
  high_leverage  boolean NOT NULL DEFAULT false,
  completed      boolean NOT NULL DEFAULT false,
  done_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE week_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_week_actions" ON week_actions;
CREATE POLICY "select_own_week_actions" ON week_actions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_week_actions" ON week_actions;
CREATE POLICY "insert_own_week_actions" ON week_actions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_week_actions" ON week_actions;
CREATE POLICY "update_own_week_actions" ON week_actions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_week_actions" ON week_actions;
CREATE POLICY "delete_own_week_actions" ON week_actions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS week_actions_plan_idx ON week_actions (week_plan_id);
CREATE INDEX IF NOT EXISTS week_actions_user_idx ON week_actions (user_id);

-- ────────────────────────────────────────────────
-- week_meetings
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS week_meetings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id uuid NOT NULL REFERENCES week_plans(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL DEFAULT 'new_biz',
  account      text NOT NULL DEFAULT '',
  logged_at    timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE week_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_week_meetings" ON week_meetings;
CREATE POLICY "select_own_week_meetings" ON week_meetings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_week_meetings" ON week_meetings;
CREATE POLICY "insert_own_week_meetings" ON week_meetings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_week_meetings" ON week_meetings;
CREATE POLICY "update_own_week_meetings" ON week_meetings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_week_meetings" ON week_meetings;
CREATE POLICY "delete_own_week_meetings" ON week_meetings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS week_meetings_plan_idx ON week_meetings (week_plan_id);

-- ────────────────────────────────────────────────
-- week_intelligence
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS week_intelligence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id        uuid NOT NULL UNIQUE REFERENCES week_plans(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  high_leverage_plays jsonb NOT NULL DEFAULT '[]',
  reality_check       jsonb,
  gaps                jsonb NOT NULL DEFAULT '[]',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE week_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_week_intelligence" ON week_intelligence;
CREATE POLICY "select_own_week_intelligence" ON week_intelligence FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_week_intelligence" ON week_intelligence;
CREATE POLICY "insert_own_week_intelligence" ON week_intelligence FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_week_intelligence" ON week_intelligence;
CREATE POLICY "update_own_week_intelligence" ON week_intelligence FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_week_intelligence" ON week_intelligence;
CREATE POLICY "delete_own_week_intelligence" ON week_intelligence FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS week_intelligence_plan_idx ON week_intelligence (week_plan_id);
