create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique default ('GTS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  idempotency_key text unique,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  email text not null check (position('@' in email) > 1 and char_length(email) <= 160),
  phone text not null check (char_length(phone) between 5 and 30),
  alternate_phone text,
  country text not null check (char_length(country) between 2 and 100),
  region text, town text not null, postal_code text, address_line1 text not null, address_line2 text, delivery_instructions text,
  shipping_method text not null check (shipping_method in ('local_delivery','international_shipping','pickup')),
  shipment_notes text, currency text not null check (currency in ('UGX','USD','EUR','GBP')),
  items_subtotal numeric(14,2) not null check (items_subtotal >= 0), shipping_quote numeric(14,2),
  shipping_currency text check (shipping_currency is null or shipping_currency in ('UGX','USD','EUR','GBP')),
  shipping_provider text, tracking_number text, tracking_url text,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed','refunded','partially_refunded')),
  fulfillment_status text not null default 'received' check (fulfillment_status in ('received','reviewing','awaiting_shipping_quote','awaiting_customer_approval','awaiting_payment','paid','packing','dispatched','delivered','cancelled','refunded')),
  internal_notes text, address_confirmed boolean not null default false check (address_confirmed),
  shipping_quote_acknowledged boolean not null default false check (shipping_quote_acknowledged),
  customs_acknowledged boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null, product_name text not null, product_slug text,
  product_image_url text, quantity integer not null check (quantity between 1 and 20),
  unit_price numeric(14,2) not null check (unit_price >= 0), currency text not null check (currency in ('UGX','USD','EUR','GBP')),
  line_total numeric(14,2) not null check (line_total >= 0), created_at timestamptz not null default now()
);
create table if not exists public.store_order_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.store_orders(id) on delete cascade,
  event_type text not null, from_status text, to_status text, note text, actor_user_id uuid, created_at timestamptz not null default now()
);
create index if not exists store_orders_created_at_idx on public.store_orders(created_at desc);
create index if not exists store_orders_status_idx on public.store_orders(fulfillment_status, payment_status);
create index if not exists store_orders_email_idx on public.store_orders(lower(email));
create index if not exists store_order_items_order_idx on public.store_order_items(order_id);
create index if not exists store_order_events_order_idx on public.store_order_events(order_id, created_at desc);
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;
alter table public.store_order_events enable row level security;
drop policy if exists "Admins manage store orders" on public.store_orders;
create policy "Admins manage store orders" on public.store_orders for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "Admins manage store order items" on public.store_order_items;
create policy "Admins manage store order items" on public.store_order_items for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "Admins manage store order events" on public.store_order_events;
create policy "Admins manage store order events" on public.store_order_events for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update, delete on public.store_orders to authenticated;
grant select, insert, update, delete on public.store_order_items to authenticated;
grant select, insert, update, delete on public.store_order_events to authenticated;