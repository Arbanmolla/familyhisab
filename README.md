# FAMILY HISAB

Family expense tracker with Supabase online sync.

## Login

- User ID: `Arban Molla`
- Password: `Arban@2004`

- User ID: `Abu Bakkar`
- Password: `Bakkar@2000`

## Online Data

App is connected to Supabase:

```text
https://qhzijagmhyooptuwawye.supabase.co
```

Run [supabase-setup.sql](supabase-setup.sql) once in Supabase `SQL Editor`.

SQL:

```sql
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
```

After this, GitHub Pages live app will save data online automatically.

If the app already had old tables, run the updated `supabase-setup.sql` again. It adds admin/profile support.

## Features

- Login required before seeing any data
- No create-account option
- Expense row shows only the user name
- Supabase online save
- Night mode
- Profile name/photo edit
- Arban Molla admin panel
- Admin can create new IDs
- Category and budget graphs
- Monthly budget set only once per month
- New month starts with a new budget option
- Warning when budget is near limit or crossed
- Bazar category shows `কি বাজার`
- Onnanno category shows `অন্যান্য কি`
- Date range report and PDF print

## Run Locally

```powershell
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## GitHub Pages

1. Create a GitHub repo.
2. Upload `index.html`, `styles.css`, `app.js`, and `README.md`.
3. Go to repo `Settings > Pages`.
4. Source: `Deploy from a branch`.
5. Branch: `main`, folder: `/root`.
6. Save.
7. Use the GitHub Pages link from any device.
