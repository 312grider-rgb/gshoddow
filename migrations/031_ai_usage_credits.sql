-- 031: AI usage tracking, plan limits and a credit balance (PostgreSQL / Supabase)
-- ADDITIVE ONLY: new tables and functions. Does not alter or delete anything existing.
-- NOT RUN YET. Safe to run before or after deploying the new api/ask-ai.js.
--
-- How it fits together
--   * api/ask-ai.js (server, service key) calls ai_consume() before each AI request and
--     ai_finish() after it. Browsers CANNOT call these functions or write these tables.
--   * The daily limit comes from plan_features.ai_requests_per_day (migration 028),
--     so limits are changed by editing a row, not code. -1 means unlimited.
--   * When the plan limit is used up, one credit is spent per request if the user has any
--     (plan_features key 'ai_credits_per_request' can change the cost; default 1).
--   * Credits are only added by credit_grant(), which a future payment webhook calls.
--     No payment provider is connected yet, so nothing adds credits automatically today.
--   * The day is a UTC day.
--   * AI_ENFORCE_LIMITS=false (default in Vercel): usage is recorded, nobody is blocked by
--     their plan. Set it to true when you are ready to enforce limits.

-- 1) AI usage events (one row per AI request)
create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null default 'general',
  status text not null default 'reserved' check (status in ('reserved','ok','failed')),
  source text not null check (source in ('plan','monitor','credit')),
  credits_spent integer not null default 0 check (credits_spent >= 0),
  prompt_chars integer,
  max_tokens integer,
  tokens_in integer,
  tokens_out integer,
  model text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists ai_usage_events_user_day_idx
  on public.ai_usage_events (user_id, created_at desc);

-- 2) Credit balance per user (changed only by the functions below)
create table if not exists public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- 3) Credit ledger: append-only history of every change to a balance.
--    No foreign key on user_id on purpose: financial history must survive account deletion.
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('purchase','grant','ai_usage','refund','adjustment')),
  usage_event_id uuid,
  order_id uuid,            -- will point to the future orders table (payment stage)
  note text,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

create or replace function public.credit_ledger_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'credit_ledger is append-only';
end;
$$;

drop trigger if exists credit_ledger_no_change on public.credit_ledger;
create trigger credit_ledger_no_change
  before update or delete on public.credit_ledger
  for each row execute function public.credit_ledger_append_only();

-- 4) Security: users may READ their own rows (admins read all). Nobody writes from the browser.
alter table public.ai_usage_events enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;

drop policy if exists ai_usage_read on public.ai_usage_events;
create policy ai_usage_read on public.ai_usage_events
  for select using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists credit_accounts_read on public.credit_accounts;
create policy credit_accounts_read on public.credit_accounts
  for select using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists credit_ledger_read on public.credit_ledger;
create policy credit_ledger_read on public.credit_ledger
  for select using (user_id = auth.uid() or public.is_platform_admin());

revoke insert, update, delete on public.ai_usage_events from anon, authenticated;
revoke insert, update, delete on public.credit_accounts from anon, authenticated;
revoke insert, update, delete on public.credit_ledger from anon, authenticated;

-- 5) ai_consume: decide whether this request is allowed and record it (atomic per user)
create or replace function public.ai_consume(
  p_user uuid,
  p_feature text,
  p_prompt_chars integer,
  p_max_tokens integer,
  p_enforce boolean,
  p_hard_cap integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_cost integer;
  v_balance integer;
  v_used_plan integer;
  v_used_total integer;
  v_source text;
  v_spent integer := 0;
  v_event uuid;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  -- one request at a time per user, so counts and balances cannot be raced
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  select p.code into v_plan
    from subscriptions s join plans p on p.id = s.plan_id
   where s.user_id = p_user
     and s.status in ('active','trialing')
     and (s.expires_at is null or s.expires_at > now())
   order by s.started_at desc
   limit 1;
  v_plan := coalesce(v_plan, 'free');

  select (f.value #>> '{}')::integer into v_limit
    from plan_features f join plans p on p.id = f.plan_id
   where p.code = v_plan and f.feature_key = 'ai_requests_per_day';
  v_limit := coalesce(v_limit, 5);               -- missing row: fall back to a small limit

  select (f.value #>> '{}')::integer into v_cost
    from plan_features f join plans p on p.id = f.plan_id
   where p.code = v_plan and f.feature_key = 'ai_credits_per_request';
  v_cost := greatest(coalesce(v_cost, 1), 1);

  select coalesce(balance, 0) into v_balance from credit_accounts where user_id = p_user;
  v_balance := coalesce(v_balance, 0);

  select count(*) filter (where source in ('plan','monitor')), count(*)
    into v_used_plan, v_used_total
    from ai_usage_events
   where user_id = p_user
     and created_at >= v_day_start
     and status in ('reserved','ok');

  -- absolute ceiling, always enforced (protects the provider bill)
  if v_used_total >= p_hard_cap then
    return jsonb_build_object('allowed', false, 'reason', 'hard_cap',
                              'used_today', v_used_total, 'limit', v_limit, 'plan', v_plan);
  end if;

  if (not p_enforce) or v_limit < 0 or v_used_plan < v_limit then
    v_source := case when p_enforce then 'plan' else 'monitor' end;
  elsif v_balance >= v_cost then
    v_source := 'credit';
    v_spent := v_cost;
    update credit_accounts set balance = balance - v_cost, updated_at = now()
     where user_id = p_user;
    v_balance := v_balance - v_cost;
  else
    return jsonb_build_object('allowed', false, 'reason', 'limit_reached',
                              'used_today', v_used_plan, 'limit', v_limit, 'plan', v_plan,
                              'balance', v_balance);
  end if;

  insert into ai_usage_events (user_id, feature, source, credits_spent, prompt_chars, max_tokens)
  values (p_user, left(coalesce(p_feature, 'general'), 40), v_source, v_spent,
          p_prompt_chars, p_max_tokens)
  returning id into v_event;

  if v_spent > 0 then
    insert into credit_ledger (user_id, delta, reason, usage_event_id)
    values (p_user, -v_spent, 'ai_usage', v_event);
  end if;

  return jsonb_build_object('allowed', true, 'event_id', v_event, 'source', v_source,
                            'plan', v_plan, 'used_today', v_used_total + 1,
                            'limit', v_limit, 'balance', v_balance, 'enforced', p_enforce);
end;
$$;

-- 6) ai_finish: close the event; refund credits if the AI call failed
create or replace function public.ai_finish(
  p_event uuid,
  p_status text,
  p_tokens_in integer,
  p_tokens_out integer,
  p_model text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev ai_usage_events%rowtype;
begin
  if p_status not in ('ok','failed') then
    raise exception 'invalid status %', p_status;
  end if;

  select * into v_ev from ai_usage_events where id = p_event for update;
  if not found or v_ev.status <> 'reserved' then
    return;                                       -- unknown or already closed: do nothing
  end if;

  update ai_usage_events
     set status = p_status, tokens_in = p_tokens_in, tokens_out = p_tokens_out,
         model = p_model, finished_at = now()
   where id = p_event;

  if p_status = 'failed' and v_ev.credits_spent > 0 then
    perform pg_advisory_xact_lock(hashtextextended(v_ev.user_id::text, 0));
    update credit_accounts set balance = balance + v_ev.credits_spent, updated_at = now()
     where user_id = v_ev.user_id;
    insert into credit_ledger (user_id, delta, reason, usage_event_id, note)
    values (v_ev.user_id, v_ev.credits_spent, 'refund', p_event, 'AI request failed');
  end if;
end;
$$;

-- 7) credit_grant: the ONLY way credits are added. For a future payment webhook or an admin tool
--    running on the server. Returns the new balance.
create or replace function public.credit_grant(
  p_user uuid,
  p_amount integer,
  p_reason text,
  p_note text default null,
  p_order uuid default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if p_reason not in ('purchase','grant','adjustment') then
    raise exception 'invalid reason %', p_reason;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  insert into credit_accounts (user_id, balance) values (p_user, p_amount)
  on conflict (user_id) do update
    set balance = credit_accounts.balance + p_amount, updated_at = now()
  returning balance into v_balance;

  insert into credit_ledger (user_id, delta, reason, order_id, note)
  values (p_user, p_amount, p_reason, p_order, p_note);

  return v_balance;
end;
$$;

-- 8) Only the server (service role) may run these. Not anon, not logged-in users.
revoke all on function public.ai_consume(uuid, text, integer, integer, boolean, integer)
  from public, anon, authenticated;
revoke all on function public.ai_finish(uuid, text, integer, integer, text)
  from public, anon, authenticated;
revoke all on function public.credit_grant(uuid, integer, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.ai_consume(uuid, text, integer, integer, boolean, integer) to service_role;
grant execute on function public.ai_finish(uuid, text, integer, integer, text) to service_role;
grant execute on function public.credit_grant(uuid, integer, text, text, uuid) to service_role;

-- ---------------------------------------------------------------
-- TESTS (Supabase SQL editor). Replace USER_ID with one of your user ids.
-- 1) A logged-in user cannot call the functions (expect: permission denied):
--    begin; set local role authenticated;
--    select set_config('request.jwt.claims','{"sub":"USER_ID","role":"authenticated"}',true);
--    select ai_consume('USER_ID','test',10,100,false,300);
--    rollback;
-- 2) A logged-in user cannot give themselves credits (expect: permission denied / RLS error):
--    begin; set local role authenticated;
--    select set_config('request.jwt.claims','{"sub":"USER_ID","role":"authenticated"}',true);
--    insert into credit_accounts (user_id, balance) values ('USER_ID', 999);
--    rollback;
-- 3) Ledger is append-only (expect: error). Run as postgres in the SQL editor:
--    update credit_ledger set delta = delta;   -- only meaningful once a row exists
-- ---------------------------------------------------------------
-- ROLLBACK (drops only the new objects):
-- drop function if exists public.credit_grant(uuid, integer, text, text, uuid);
-- drop function if exists public.ai_finish(uuid, text, integer, integer, text);
-- drop function if exists public.ai_consume(uuid, text, integer, integer, boolean, integer);
-- drop table if exists public.credit_ledger;
-- drop function if exists public.credit_ledger_append_only();
-- drop table if exists public.credit_accounts;
-- drop table if exists public.ai_usage_events;
