create extension if not exists pgcrypto;

-- ==========================================
-- VEHICLES
-- ==========================================

create table if not exists public.vehicles (
    id uuid primary key default gen_random_uuid(),
    registration text unique not null,
    customer text not null,
    date_in date not null default current_date,
    job_type text not null default 'Repair',
    status text not null default 'Under Repair',
    date_out date,
    released_to text,
    released_contact text,
    description text,
    billed numeric(12,2) not null default 0,
    paid numeric(12,2) not null default 0,
    created_at timestamptz not null default now()
);

-- ==========================================
-- VEHICLE EXPENSES
-- ==========================================

create table if not exists public.expenses (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    expense_date date not null default current_date,
    description text not null,
    category text not null default 'Parts',
    amount numeric(12,2) not null default 0,
    created_at timestamptz not null default now()
);

-- ==========================================
-- PETTY CASH
-- ==========================================

create table if not exists public.petty_cash (
    id uuid primary key default gen_random_uuid(),
    cash_date date not null default current_date,
    description text not null,
    paid_to text,
    category text not null default 'Other',
    amount numeric(12,2) not null default 0,
    notes text,
    created_at timestamptz not null default now()
);

-- ==========================================
-- REQUISITIONS
-- ==========================================

create table if not exists public.requisitions (
    id uuid primary key default gen_random_uuid(),
    req_no text not null,
    req_date date not null default current_date,
    requested_by text not null,
    vehicle_id uuid references public.vehicles(id) on delete set null,
    item_description text not null,
    quantity numeric(12,2) not null default 1,
    unit_cost numeric(12,2) not null default 0,
    total_amount numeric(12,2) not null default 0,
    status text not null default 'Pending',
    notes text,
    created_at timestamptz not null default now()
);

-- ==========================================
-- INDEXES
-- ==========================================

create index if not exists expenses_vehicle_id_idx
on public.expenses(vehicle_id);

create index if not exists expenses_date_idx
on public.expenses(expense_date);

create index if not exists petty_cash_date_idx
on public.petty_cash(cash_date);

create index if not exists requisitions_vehicle_id_idx
on public.requisitions(vehicle_id);

create index if not exists requisitions_date_idx
on public.requisitions(req_date);

-- ==========================================
-- SECURITY
-- ==========================================

alter table public.vehicles enable row level security;
alter table public.expenses enable row level security;
alter table public.petty_cash enable row level security;
alter table public.requisitions enable row level security;

drop policy if exists "garage vehicles" on public.vehicles;
create policy "garage vehicles"
on public.vehicles
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "garage expenses" on public.expenses;
create policy "garage expenses"
on public.expenses
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "garage petty cash" on public.petty_cash;
create policy "garage petty cash"
on public.petty_cash
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "garage requisitions" on public.requisitions;
create policy "garage requisitions"
on public.requisitions
for all
to anon, authenticated
using (true)
with check (true);