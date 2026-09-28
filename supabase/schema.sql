-- Run once in the Supabase SQL editor. Only the server service role can access data.
create table if not exists public.finance_state (
  id integer primary key check (id = 1),
  revision bigint not null default 0,
  data jsonb not null
);
alter table public.finance_state enable row level security;
revoke all on public.finance_state from anon, authenticated;
grant select, update on public.finance_state to service_role;
insert into public.finance_state(id, data) values (1,
 '{"transactions":[],"links":[],"chats":[],"jobs":[],"updates":[],"nextRow":{"sale":2,"expense":2}}'::jsonb
) on conflict do nothing;

-- Compare and swap makes all submissions, decisions and delivery claims atomic.
create or replace function public.finance_commit(expected_revision bigint, new_data jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.finance_state set data = new_data, revision = revision + 1
    where id = 1 and revision = expected_revision;
  return found;
end $$;
revoke all on function public.finance_commit(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.finance_commit(bigint,jsonb) to service_role;
