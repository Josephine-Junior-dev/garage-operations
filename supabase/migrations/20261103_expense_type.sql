-- Garage Operations Pro: expense target classification
-- Run once in Supabase SQL Editor before using the new Expense For options.
alter table public.expenses
  add column if not exists expense_type text not null default 'Vehicle';

update public.expenses
set expense_type = case
  when vehicle_id is not null then 'Vehicle'
  else 'General'
end
where expense_type is null or expense_type = '';

grant select, insert, update, delete on public.expenses to authenticated;
