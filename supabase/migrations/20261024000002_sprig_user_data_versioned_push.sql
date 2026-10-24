-- Roadmap 0.2 — versioned cloud backup: a device can only overwrite the copy it last saw.
-- STATUS: applied to the production project (pivktajvfpjjgejfngeb) on 2026-10-24.
alter table public.sprig_user_data add column if not exists rev bigint not null default 0;
alter table public.sprig_user_data add column if not exists device_id text;

-- Push this device's blob if the cloud copy is still at p_expected_rev.
-- Returns {ok:true, rev} or {ok:false, rev, device_id, updated_at} when another device changed it.
create or replace function public.push_user_data(p_expected_rev bigint, p_device text, p_data jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.sprig_user_data%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_row from public.sprig_user_data where user_id = v_uid for update;
  if not found then
    insert into public.sprig_user_data (user_id, app_data, updated_at, rev, device_id)
    values (v_uid, p_data, now(), 1, p_device);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if v_row.rev <> p_expected_rev then
    return jsonb_build_object('ok', false, 'rev', v_row.rev, 'device_id', v_row.device_id, 'updated_at', v_row.updated_at);
  end if;
  update public.sprig_user_data
    set app_data = p_data, updated_at = now(), rev = v_row.rev + 1, device_id = p_device
    where user_id = v_uid;
  return jsonb_build_object('ok', true, 'rev', v_row.rev + 1);
end;
$$;

revoke all on function public.push_user_data(bigint, text, jsonb) from public, anon;
grant execute on function public.push_user_data(bigint, text, jsonb) to authenticated;
