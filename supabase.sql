-- ==========================================================
-- GARAGE OPERATIONS PRO
-- COMPLETE CORRECTED SUPABASE DATABASE
-- ==========================================================
-- IMPORTANT:
-- This script is designed to preserve existing records.
-- It uses IF NOT EXISTS when creating tables/columns.
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
    model text,
    model_year text,
    color text,
    created_at timestamptz default now()
);

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
add column if not exists model text;

alter table public.vehicles
add column if not exists model_year text;

alter table public.vehicles
add column if not exists color text;

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
add column if not exists vehicle_id uuid;

alter table public.expenses
add column if not exists expense_date date
default current_date;

alter table public.expenses
add column if not exists description text;

alter table public.expenses
add column if not exists category text
not null default 'Parts';

alter table public.expenses
add column if not exists amount numeric(12,2)
not null default 0;

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
add column if not exists cash_date date
default current_date;

alter table public.petty_cash
add column if not exists description text;

alter table public.petty_cash
add column if not exists paid_to text;

alter table public.petty_cash
add column if not exists category text;

alter table public.petty_cash
add column if not exists amount numeric(12,2)
not null default 0;

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

alter table public.requisitions
add column if not exists req_no text;

alter table public.requisitions
add column if not exists req_date date
default current_date;

alter table public.requisitions
add column if not exists requested_by text;

alter table public.requisitions
add column if not exists vehicle_id uuid;

alter table public.requisitions
add column if not exists item_description text;

alter table public.requisitions
add column if not exists quantity numeric(12,2)
not null default 1;

alter table public.requisitions
add column if not exists unit_cost numeric(12,2)
not null default 0;

alter table public.requisitions
add column if not exists total_amount numeric(12,2)
not null default 0;

alter table public.requisitions
add column if not exists status text
default 'Pending';

alter table public.requisitions
add column if not exists notes text;

alter table public.requisitions
add column if not exists expense_type text
not null default 'Materials';

alter table public.requisitions
add column if not exists created_at timestamptz default now();


-- ==========================================================
-- 5. INVOICES
-- ==========================================================

create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid(),
    invoice_no text unique not null,
    invoice_date date not null default current_date,

    company_name text default 'CRYSTAL MOTORS (K) LTD',
    company_address text,
    company_phone text,
    company_email text,

    vehicle_id uuid references public.vehicles(id) on delete set null,

    customer text,
    job_description text,

    labour numeric(12,2) default 0,
    parts numeric(12,2) default 0,
    other numeric(12,2) default 0,

    subtotal numeric(12,2) default 0,
    paid numeric(12,2) default 0,
    balance numeric(12,2) default 0,

    status text default 'Pending',
    notes text,

    created_at timestamptz default now()
);

alter table public.invoices
add column if not exists invoice_no text;

alter table public.invoices
add column if not exists invoice_date date
default current_date;

alter table public.invoices
add column if not exists company_name text
default 'CRYSTAL MOTORS (K) LTD';

alter table public.invoices
add column if not exists company_address text;

alter table public.invoices
add column if not exists company_phone text;

alter table public.invoices
add column if not exists company_email text;

alter table public.invoices
add column if not exists vehicle_id uuid;

alter table public.invoices
add column if not exists customer text;

alter table public.invoices
add column if not exists job_description text;

alter table public.invoices
add column if not exists labour numeric(12,
