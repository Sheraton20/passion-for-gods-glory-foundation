-- Donor reporting foundation: additive, admin-only tables.
-- No existing records are modified or deleted.

create table if not exists public.donors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 180),
  email text not null,
  country text,
  preferred_language text not null default 'en' check (char_length(preferred_language) between 2 and 10),
  report_email_opt_in boolean not null default false,
  consent_recorded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donors_email_normalized check (email = lower(trim(email)) and position('@' in email) > 1)
);
create unique index if not exists donors_email_unique_lower on public.donors (lower(email));

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid references public.donors(id) on delete restrict,
  donor_name_snapshot text,
  donor_email_snapshot text,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'UGX' check (currency in ('UGX','USD','EUR','GBP','KES','TZS','RWF')),
  received_at timestamptz,
  programme_name text,
  payment_method text,
  reference_code text,
  status text not null default 'pending' check (status in ('pending','received','refunded','cancelled')),
  receipt_reference text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists donations_donor_id_idx on public.donations(donor_id);
create index if not exists donations_received_at_idx on public.donations(received_at);
create index if not exists donations_status_idx on public.donations(status);

create table if not exists public.foundation_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null,
  description text not null check (char_length(trim(description)) between 3 and 1000),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'UGX' check (currency in ('UGX','USD','EUR','GBP','KES','TZS','RWF')),
  programme_name text,
  supplier_or_payee text,
  receipt_reference text,
  review_status text not null default 'draft' check (review_status in ('draft','verified','rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  recorded_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists foundation_expenses_date_idx on public.foundation_expenses(expense_date);
create index if not exists foundation_expenses_review_idx on public.foundation_expenses(review_status);

create table if not exists public.donor_reports (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.donors(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  subject text not null,
  report_body text not null,
  financial_summary jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','sent','cancelled')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);
create index if not exists donor_reports_donor_period_idx on public.donor_reports(donor_id, period_start, period_end);
create index if not exists donor_reports_status_idx on public.donor_reports(status);

create table if not exists public.donor_email_events (
  id uuid primary key default gen_random_uuid(),
  donor_report_id uuid references public.donor_reports(id) on delete set null,
  donor_id uuid references public.donors(id) on delete set null,
  recipient_email text not null,
  provider text not null default 'resend',
  provider_message_id text,
  event_type text not null check (event_type in ('queued','sent','delivered','bounced','complained','failed')),
  detail text,
  occurred_at timestamptz not null default now()
);
create index if not exists donor_email_events_report_idx on public.donor_email_events(donor_report_id);
create index if not exists donor_email_events_recipient_idx on public.donor_email_events(recipient_email);

alter table public.donors enable row level security;
alter table public.donations enable row level security;
alter table public.foundation_expenses enable row level security;
alter table public.donor_reports enable row level security;
alter table public.donor_email_events enable row level security;

drop policy if exists "Admins manage donors" on public.donors;
create policy "Admins manage donors" on public.donors for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "Admins manage donations" on public.donations;
create policy "Admins manage donations" on public.donations for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "Admins manage foundation expenses" on public.foundation_expenses;
create policy "Admins manage foundation expenses" on public.foundation_expenses for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "Admins manage donor reports" on public.donor_reports;
create policy "Admins manage donor reports" on public.donor_reports for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "Admins manage donor email events" on public.donor_email_events;
create policy "Admins manage donor email events" on public.donor_email_events for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

revoke all on public.donors, public.donations, public.foundation_expenses, public.donor_reports, public.donor_email_events from anon;
grant select, insert, update, delete on public.donors, public.donations, public.foundation_expenses, public.donor_reports, public.donor_email_events to authenticated;
