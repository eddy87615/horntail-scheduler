-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- Creates the single key/value table the app uses, plus public access policies.

create table if not exists public.kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: this is a casual guild tool, so anyone holding the
-- anon key may read/write. Tighten later (or move to Supabase Auth) if needed.
alter table public.kv enable row level security;

drop policy if exists "kv public read"   on public.kv;
drop policy if exists "kv public insert" on public.kv;
drop policy if exists "kv public update" on public.kv;
drop policy if exists "kv public delete" on public.kv;

create policy "kv public read"   on public.kv for select using (true);
create policy "kv public insert" on public.kv for insert with check (true);
create policy "kv public update" on public.kv for update using (true) with check (true);
create policy "kv public delete" on public.kv for delete using (true);

-- Optional: enable Realtime so teammates' edits show up live.
-- (You can also toggle this in Dashboard → Database → Replication.)
alter publication supabase_realtime add table public.kv;
