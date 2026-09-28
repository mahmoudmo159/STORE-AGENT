create extension if not exists pgcrypto;

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  currency text not null default 'EGP',
  created_at timestamptz not null default now()
);

create table if not exists store_members (
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner' check (role in ('owner','admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  sku text,
  barcode text,
  name text not null,
  description text default '',
  category text default '',
  brand text default '',
  price numeric(12,2) not null default 0,
  currency text not null default 'EGP',
  colors jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  stock jsonb not null default '{}'::jsonb,
  images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_store_sku_unique
on products(store_id, sku) where sku is not null;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  customer jsonb not null default '{}'::jsonb,
  lines jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  question text,
  answer text not null,
  category text default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists store_settings (
  store_id uuid primary key references stores(id) on delete cascade,
  shipping jsonb not null default '{}'::jsonb,
  return_policy text default '',
  payment_methods jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists agent_configs (
  store_id uuid primary key references stores(id) on delete cascade,
  name text not null default 'Store Assistant',
  tone text not null default 'friendly',
  style text not null default 'concise',
  instructions text not null default '',
  enabled_tools jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists analytics_daily (
  store_id uuid not null references stores(id) on delete cascade,
  day date not null,
  messages integer not null default 0,
  conversations integer not null default 0,
  primary key (store_id, day)
);

alter table stores enable row level security;
alter table store_members enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table knowledge enable row level security;
alter table store_settings enable row level security;
alter table agent_configs enable row level security;
alter table analytics_daily enable row level security;

-- The backend uses the Supabase service role for controlled server-side access.
-- Owner/customer frontends should call the backend API, not write directly to these tables.
