-- ============================================================
-- DAR EL KHAMASA — Supabase Schema (Migration 0001)
-- يُشغّل في Supabase SQL Editor عند ربط قاعدة البيانات
-- ============================================================

-- Enums
create type order_status as enum ('new','pending_call','no_answer','callback','confirmed','cancelled','preparing','ready_to_ship','shipped','in_transit','delivered','returned');
create type ship_method as enum ('home','stopdesk');
create type inv_type as enum ('in','out','adjustment','sale','return');
create type ship_status as enum ('created','label_ready','picked_up','in_transit','out_for_delivery','delivered','returned','failed');

-- Settings (سطر واحد)
create table settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'دار الخماسة',
  store_phone text default '+213555000000',
  store_phone2 text,
  currency text default 'DZD',
  cod_enabled boolean default true,
  default_shipping_home int default 1000,
  default_shipping_stopdesk int default 600,
  packaging_cost int default 150,
  low_stock_default int default 5,
  order_number_prefix text default 'DEK',
  landing_defaults jsonb default '{}',
  updated_at timestamptz default now()
);

-- Profiles (مستخدمو الإدارة عبر Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text default 'admin',
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text default '',
  description text default '',
  images jsonb default '[]',
  videos jsonb default '[]',
  sku text,
  price int not null check (price >= 0),
  cost_price int default 0 check (cost_price >= 0),
  compare_at_price int,
  stock int default 0 check (stock >= 0),
  low_stock_threshold int default 5,
  variants jsonb default '[]',
  published boolean default false,
  order_form jsonb default '{}',
  seo_title text, seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_products_slug on products(slug);
create index idx_products_published on products(published);

-- Landing pages + versions
create table landing_pages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  slug text unique not null,
  title text not null,
  draft jsonb not null default '{"blocks":[],"theme":{}}',
  published jsonb,
  status text default 'draft' check (status in ('draft','published')),
  seo_title text, seo_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz
);
create table page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references landing_pages(id) on delete cascade,
  label text,
  content jsonb not null,
  created_at timestamptz default now()
);
create index idx_pages_slug on landing_pages(slug);
create index idx_pages_product on landing_pages(product_id);

-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  first_name text, last_name text,
  phone text unique not null,
  wilaya text, wilaya_code int, commune text, address text,
  notes text,
  orders_count int default 0,
  total_spent bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_customers_phone on customers(phone);

-- Orders
create sequence order_number_seq start 1000;
create table orders (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,
  customer_id uuid references customers(id),
  customer_snapshot jsonb not null,
  items jsonb not null,            -- snapshot للأسعار والتكاليف وقت الطلب
  method ship_method default 'home',
  shipping_fee int default 0,
  shipping_cost_actual int,
  discount int default 0,
  subtotal int default 0,
  total int not null check (total >= 0),
  status order_status default 'new',
  attribution jsonb,
  ip text, user_agent text,
  duplicate_of uuid references orders(id),
  confirmed_at timestamptz, delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_orders_status on orders(status);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_created on orders(created_at desc);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  from_status order_status, to_status order_status not null,
  note text, by_user text,
  at timestamptz default now()
);
create index idx_status_history_order on order_status_history(order_id);

create table call_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  result text not null check (result in ('answered','no_answer','voicemail','busy','other')),
  note text, next_callback_at timestamptz, by_user text,
  at timestamptz default now()
);
create index idx_call_logs_order on call_logs(order_id);

-- Inventory
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  variant_id text,
  type inv_type not null,
  quantity int not null check (quantity > 0),
  reason text, order_id uuid references orders(id),
  created_by text,
  created_at timestamptz default now()
);
create index idx_inv_product on inventory_movements(product_id);

-- Shipping
create table shipping_providers (
  id text primary key,
  code text unique not null,
  name text not null,
  active boolean default true,
  api_base_url text,
  token text,                       -- encrypted / service_role only
  sandbox boolean default false,
  supports_home boolean default true,
  supports_stopdesk boolean default true,
  last_test jsonb
);
create table shipping_rates (
  wilaya_code int primary key,
  wilaya_ar text not null,
  home int not null,
  stopdesk int not null
);
create table free_shipping_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  type text not null check (type in ('all','min_order','products','wilayas','period')),
  active boolean default true,
  config jsonb default '{}',
  created_at timestamptz default now()
);
create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  provider_id text references shipping_providers(id),
  method ship_method not null,
  tracking_number text,
  label_url text,
  status ship_status default 'created',
  events jsonb default '[]',
  fee_charged int default 0,
  cost_actual int,
  api_mode text default 'local' check (api_mode in ('live','local')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_shipments_order on shipments(order_id);

-- Offers / Expenses / Reviews / Analytics
create table offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default 'percent' check (type in ('percent','fixed')),
  value int default 0,
  product_ids jsonb default '[]',
  code text,
  start_at timestamptz, end_at timestamptz,
  active boolean default true,
  countdown_end timestamptz,
  created_at timestamptz default now()
);
create table expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null check (category in ('ads','packaging','shipping','services','other')),
  amount bigint not null,
  date date not null default current_date,
  note text, order_id uuid references orders(id),
  created_at timestamptz default now()
);
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  author text default 'زبون',
  rating int not null check (rating between 1 and 5),
  text text,
  approved boolean default true,
  created_at timestamptz default now()
);
create table page_views (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null,
  product_id uuid references products(id),
  referrer text,
  utm jsonb,
  at timestamptz default now()
);
create index idx_views_slug on page_views(page_slug);
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz default now(),
  actor text, action text not null,
  entity text not null, entity_id text, detail text
);

-- ===== Row Level Security =====
alter table products enable row level security;
alter table landing_pages enable row level security;
alter table page_versions enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_status_history enable row level security;
alter table call_logs enable row level security;
alter table inventory_movements enable row level security;
alter table shipping_providers enable row level security;
alter table shipping_rates enable row level security;
alter table free_shipping_rules enable row level security;
alter table shipments enable row level security;
alter table offers enable row level security;
alter table expenses enable row level security;
alter table reviews enable row level security;
alter table settings enable row level security;
alter table audit_logs enable row level security;

-- القراءة العامة: المنتجات المنشورة + الصفحات المنشورة + التقييمات المعتمدة + الأسعار
create policy "public read published products" on products for select using (published = true);
create policy "public read published pages" on landing_pages for select using (status = 'published');
create policy "public read approved reviews" on reviews for select using (approved = true);
create policy "public read rates" on shipping_rates for select using (true);
create policy "public read free rules" on free_shipping_rules for select using (active = true);
create policy "public read settings" on settings for select using (true);

-- الإدارة الكاملة عبر service_role (لن تستخدم anon key للكتابة من الواجهة؛
-- كل عمليات الإدارة تمر عبر Server Actions على الخادم).
-- عند استخدام Supabase Auth مباشرة أضف policies الخاصة بـ profiles.role = 'admin'.

-- Seed أساسي
insert into settings (id) values (1) on conflict do nothing;
