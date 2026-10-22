-- ALREADY RUN manually in Supabase on 2026-10-19 (kept here so the repo matches the database).
-- STAGE 1: Plans and subscriptions (PostgreSQL / Supabase)
-- ADDITIVE ONLY: creates new tables and functions. Does not alter or delete anything.
-- NOT RUN YET: review, then run in the Supabase SQL editor.
--
-- Uses your EXISTING function public.is_platform_admin() (already used by your
-- shared_reports policy). No new admin helper is created.
-- Confirm first that it is safe: see "SECURITY FINDING 1" in the report.

-- 2) Plans
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- 'free', 'premium', later 'school'
  name text not null,
  description text,
  price_monthly_cents integer,               -- NULL = price not set yet
  price_yearly_cents integer,
  currency text,                             -- NULL until a provider/market is chosen
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Configurable benefits per plan
create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,                 -- e.g. 'ai_requests_per_day'
  value jsonb not null,                      -- e.g. 5, true, -1 (= unlimited)
  label_fr text,                             -- text shown on the pricing page
  sort_order integer not null default 0,
  unique (plan_id, feature_key)
);

-- 4) Subscriptions (entitlements only: no payment data here)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active'
    check (status in ('active','trialing','past_due','canceled','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,                    -- NULL = no expiry
  source text not null default 'manual',     -- 'manual', 'payment', 'school', 'promo'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one live personal subscription per user
create unique index if not exists subscriptions_one_live_per_user
  on public.subscriptions (user_id)
  where status in ('active','trialing');

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

-- 5) Security: RLS on, clients read only; writes happen server-side (service role)
alter table public.plans enable row level security;
alter table public.plan_features enable row level security;
alter table public.subscriptions enable row level security;

-- Pricing page can be read by anyone (no personal data here)
drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans
  for select to anon, authenticated using (is_active or public.is_platform_admin());

drop policy if exists plan_features_read on public.plan_features;
create policy plan_features_read on public.plan_features
  for select to anon, authenticated using (true);

-- A user sees only their own subscription; admins see all
drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());

-- No insert/update/delete policies on purpose: browser clients cannot write.
-- Admin changes go through a server route that checks is_platform_admin() and uses the service role.

-- 6) Which plan does the current user have? Defaults to 'free'.
create or replace function public.get_my_plan()
returns text
language sql
stable
as $$
  select coalesce(
    (select p.code
       from public.subscriptions s
       join public.plans p on p.id = s.plan_id
      where s.user_id = auth.uid()
        and s.status in ('active','trialing')
        and (s.expires_at is null or s.expires_at > now())
      order by s.started_at desc
      limit 1),
    'free'
  );
$$;

-- 7) Starter plans. Limit values are PLACEHOLDERS: change them any time in plan_features.
insert into public.plans (code, name, description, sort_order) values
  ('free',    'Gratuit', 'L''essentiel pour apprendre, gratuitement.', 1),
  ('premium', 'Premium', 'Plus d''IA et plus d''outils pour aller plus loin.', 2)
on conflict (code) do nothing;

insert into public.plan_features (plan_id, feature_key, value, label_fr, sort_order)
select p.id, f.feature_key, f.value::jsonb, f.label_fr, f.sort_order
from public.plans p
join (values
  ('free',    'core_learning',         'true', 'Cours, leçons, défis et classes',        1),
  ('free',    'ai_requests_per_day',   '5',    '5 demandes IA par jour',                 2),
  ('free',    'saved_future_projects', '3',    '3 projets Future Architect',             3),
  ('premium', 'core_learning',         'true', 'Cours, leçons, défis et classes',        1),
  ('premium', 'ai_requests_per_day',   '100',  '100 demandes IA par jour',               2),
  ('premium', 'saved_future_projects', '-1',   'Projets Future Architect illimités',     3)
) as f(plan_code, feature_key, value, label_fr, sort_order)
  on f.plan_code = p.code
on conflict (plan_id, feature_key) do nothing;

-- ---------------------------------------------------------------
-- TESTS (run after the migration)
-- 1) select code, name from plans;                 -- expect free + premium
-- 2) select * from plan_features order by plan_id; -- expect 6 rows
-- 3) As a logged-in user: select get_my_plan();    -- expect 'free'
-- 4) As a logged-in user: insert into subscriptions (user_id, plan_id)
--      select auth.uid(), id from plans where code = 'premium';
--    expect: ERROR (row-level security). A user must NOT be able to upgrade themselves.
-- ---------------------------------------------------------------
-- ROLLBACK (only affects the new objects; deletes no existing data):
-- drop function if exists public.get_my_plan();
-- drop table if exists public.subscriptions;
-- drop table if exists public.plan_features;
-- drop table if exists public.plans;
