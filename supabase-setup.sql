create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  user_name text not null,
  expense_date date not null,
  category text not null,
  detail text,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists monthly_budgets (
  month_key text primary key,
  amount numeric not null,
  updated_at timestamptz not null default now()
);

alter table expenses enable row level security;
alter table monthly_budgets enable row level security;

drop policy if exists "allow family expenses read" on expenses;
drop policy if exists "allow family expenses insert" on expenses;
drop policy if exists "allow family expenses delete" on expenses;
drop policy if exists "allow family budgets read" on monthly_budgets;
drop policy if exists "allow family budgets upsert" on monthly_budgets;
drop policy if exists "allow family budgets update" on monthly_budgets;

create policy "allow family expenses read" on expenses
for select using (true);

create policy "allow family expenses insert" on expenses
for insert with check (true);

create policy "allow family expenses delete" on expenses
for delete using (true);

create policy "allow family budgets read" on monthly_budgets
for select using (true);

create policy "allow family budgets upsert" on monthly_budgets
for insert with check (true);

create policy "allow family budgets update" on monthly_budgets
for update using (true);
