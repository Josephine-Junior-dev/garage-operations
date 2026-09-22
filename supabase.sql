-- ==========================================================
-- GARAGE OPERATIONS PRO
-- COMPLETE / CORRECTED SUPABASE DATABASE
-- ==========================================================

-- ==========================================================
-- 1. VEHICLES
-- ==========================================================

create table if not exists public.vehicles (
    id uuid primary key default gen_random_uuid(),
    registration text unique not null,
    customer text not null,
    date_in date not null default current_date,
    date_out date,
    job_type text default 'Repair',
    status text default 'Under Repair',
    released_to text,
    released_contact text,
    description text,
    billed numeric(12,2) default 0,
    paid numeric(12,2) default 0,
    created_at timestamptz default now()
);

-- Add missing columns if the vehicles table already exists

alter table public.vehicles
add column if not exists date_out date;

alter table public.vehicles
add column if not exists released_to text;

alter table public.vehicles
add column if not exists released_contact text;

alter table public.vehicles
add column if not exists description text;

alter table public.vehicles
add column if not exists billed numeric(12,2) default 0;

alter table public.vehicles
add column if not exists paid numeric(12,2) default 0;

alter table public.vehicles
add column if not exists created_at timestamptz default now();


-- ==========================================================
-- 2. EXPENSES
-- ==========================================================

create table if not exists public.expenses (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid references public.vehicles(id) on delete cascade,
    expense_date date not null default current_date,
    description text not null,
    category text not null default 'Parts',
    amount numeric(12,2) not null default 0,
    created_at timestamptz default now()
);

alter table public.expenses
add column if not exists category text not null default 'Parts';

alter table public.expenses
add column if not exists created_at timestamptz default now();


-- ==========================================================
-- 3. PETTY CASH
-- ==========================================================

create table if not exists public.petty_cash (
    id uuid primary key default gen_random_uuid(),
    cash_date date not null default current_date,
    description text not null,
    paid_to text,
    category text,
    amount numeric(12,2) not null default 0,
    notes text,
    created_at timestamptz default now()
);

alter table public.petty_cash
add column if not exists paid_to text;

alter table public.petty_cash
add column if not exists category text;

alter table public.petty_cash
add column if not exists notes text;

alter table public.petty_cash
add column if not exists created_at timestamptz default now();


-- ==========================================================
-- 4. REQUISITIONS
-- ==========================================================

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
    status text default 'Pending',
    notes text,
    expense_type text not null default 'Materials',
    created_at timestamptz default now()
);

-- IMPORTANT:
-- The application uses expense_type for
-- Parts / Materials / Labour.

alter table public.requisitions
add column if not exists expense_type text
not null default 'Materials';

alter table public.requisitions
add column if not exists created_at timestamptz default now();


-- ==========================================================
-- 5. BASIC VALIDATION
-- ==========================================================

-- Vehicle expense categories:
-- Parts
-- Materials
-- Labour

-- Requisition expense types:
-- Parts
-- Materials
-- Labour


-- ==========================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ==========================================================

alter table public.vehicles enable row level security;
alter table public.expenses enable row level security;
alter table public.petty_cash enable row level security;
alter table public.requisitions enable row level security;


-- ==========================================================
-- 7. REMOVE OLD POLICIES
-- ==========================================================

drop policy if exists "Allow all vehicle access"
on public.vehicles;

drop policy if exists "Allow all expense access"
on public.expenses;

drop policy if exists "Allow all petty cash access"
on public.petty_cash;

drop policy if exists "Allow all requisition access"
on public.requisitions;

drop policy if exists "Enable all vehicle access"
on public.vehicles;

drop policy if exists "Enable all expense access"
on public.expenses;

drop policy if exists "Enable all petty cash access"
on public.petty_cash;

drop policy if exists "Enable all requisition access"
on public.requisitions;


-- ==========================================================
-- 8. VEHICLES POLICY
-- ==========================================================

create policy "Garage vehicles access"
on public.vehicles
for all
to anon, authenticated
using (true)
with check (true);


-- ==========================================================
-- 9. EXPENSES POLICY
-- ==========================================================

create policy "Garage expenses access"
on public.expenses
for all
to anon, authenticated
using (true)
with check (true);


-- ==========================================================
-- 10. PETTY CASH POLICY
-- ==========================================================

create policy "Garage petty cash access"
on public.petty_cash
for all
to anon, authenticated
using (true)
with check (true);


-- ==========================================================
-- 11. REQUISITIONS POLICY
-- ==========================================================

create policy "Garage requisitions access"
on public.requisitions
for all
to anon, authenticated
using (true)
with check (true);


-- ==========================================================
-- 12. FINISHED
-- ==========================================================

-- Tables:
-- vehicles
-- expenses
-- petty_cash
-- requisitions

-- Vehicle expenses:
-- Parts / Materials / Labour

-- Requisitions:
-- Parts / Materials / Labour

-- Vehicle storage/release:
-- date_out
-- released_to
-- released_contact

-- Vehicle billing:
-- billed
-- paid
