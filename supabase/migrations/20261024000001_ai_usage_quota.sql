-- Roadmap 0.1 — server-side AI quotas for /api/analyze.
-- STATUS: applied to the production project (pivktajvfpjjgejfngeb) on 2026-10-24 via the SQL Editor.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period text not null,                       -- 'YYYY-MM' (UTC)
  kind text not null check (kind in ('coach', 'scan', 'food_text')),
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period, kind)
);
alter table public.ai_usage enable row level security;
drop policy if exists "users can read their own ai usage" on public.ai_usage;
create policy "users can read their own ai usage" on public.ai_usage
  for select using ((select auth.uid()) = user_id);
-- No insert/update/delete policies: only the server (service role) writes, through the functions below.

-- Atomically count one AI call. Returns the new count, or NULL when the limit is already reached.
create or replace function public.consume_ai_quota(p_user uuid, p_kind text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period text := to_char(now() at time zone 'utc', 'YYYY-MM');
  v_count integer;
begin
  if p_limit <= 0 then return null; end if;
  insert into public.ai_usage (user_id, period, kind, count)
  values (p_user, v_period, p_kind, 1)
  on conflict (user_id, period, kind) do update
    set count = public.ai_usage.count + 1, updated_at = now()
    where public.ai_usage.count < p_limit
  returning count into v_count;
  return v_count;
end;
$$;

-- Give a call back when the AI request itself failed.
create or replace function public.refund_ai_quota(p_user uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_usage
    set count = greatest(count - 1, 0), updated_at = now()
    where user_id = p_user and kind = p_kind and period = to_char(now() at time zone 'utc', 'YYYY-MM');
end;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.refund_ai_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer) to service_role;
grant execute on function public.refund_ai_quota(uuid, text) to service_role;
