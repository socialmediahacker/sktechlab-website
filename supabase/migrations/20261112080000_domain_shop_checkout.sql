-- Server-owned registrar data and immutable checkout snapshots.
alter table public.profiles add column if not exists shop_product_limit integer;
alter table public.builder_sessions add column if not exists ecom_addon_product_limit integer;
alter table public.builder_sessions add column if not exists domain_quote_id uuid, add column if not exists domain_registrant jsonb, add column if not exists checkout_breakdown jsonb, add column if not exists checkout_locked_at timestamptz, add column if not exists shop_activated_at timestamptz, add column if not exists ecom_addon_billing text;
alter table public.profiles add column if not exists ecom_addon_expires_at timestamptz;
create table if not exists public.domain_registrar_settings (id integer primary key check(id=1), config jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
insert into public.domain_registrar_settings(id) values(1) on conflict do nothing;
create table if not exists public.domain_quotes (
 id uuid primary key default gen_random_uuid(), session_id uuid references public.builder_sessions(id), user_id uuid references auth.users(id), site_id uuid references public.sites(id),
 domain text not null, price_inr numeric(12,2) not null check(price_inr>0), renewal_inr numeric(12,2) not null check(renewal_inr>0), cost_paise bigint not null, sandbox boolean not null,
 expires_at timestamptz not null default now()+interval '15 minutes', created_at timestamptz not null default now(), check(session_id is not null or user_id is not null)
);
create table if not exists public.domain_search_events (id uuid primary key default gen_random_uuid(), scope text not null, created_at timestamptz not null default now());
create index if not exists domain_search_scope_time on public.domain_search_events(scope,created_at);
create table if not exists public.domain_registrar_contacts (
 user_id uuid not null references auth.users(id), sandbox boolean not null, customer_id text not null, contact_id text not null, created_at timestamptz not null default now(), primary key(user_id,sandbox)
);
create table if not exists public.domain_orders (
 id uuid primary key default gen_random_uuid(), quote_id uuid unique not null references public.domain_quotes(id), session_id uuid unique references public.builder_sessions(id), user_id uuid not null references auth.users(id), site_id uuid references public.sites(id),
 domain text not null, price_inr numeric(12,2) not null, renewal_inr numeric(12,2) not null, cost_paise bigint not null, sandbox boolean not null,
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','paid','registering','registered','needs_review','refund_required')),
 registrar_order_id text, registrar_customer_id text, registrar_contact_id text, payment_order_id text, payment_id text, registrant jsonb not null, agreement_url text not null,
 status_message text, expires_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists domain_active_purchase on public.domain_orders(domain,sandbox) where status in ('paid','registering','registered','needs_review');
-- Checkout and registration tables have no client writes. All actions go through authenticated/capability-checked server functions.
alter table public.domain_registrar_settings enable row level security;
alter table public.domain_quotes enable row level security;
alter table public.domain_search_events enable row level security;
alter table public.domain_registrar_contacts enable row level security;
alter table public.domain_orders enable row level security;
revoke all on public.domain_registrar_settings,public.domain_quotes,public.domain_search_events,public.domain_registrar_contacts,public.domain_orders from anon,authenticated;
grant all on public.domain_registrar_settings,public.domain_quotes,public.domain_search_events,public.domain_registrar_contacts,public.domain_orders to service_role;
alter table public.service_plans add column if not exists ecom_product_limit integer not null default 0;
create table if not exists public.shop_upgrade_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), site_id uuid not null references public.sites(id), price_inr numeric(12,2) not null check(price_inr>0), billing text not null, product_limit integer not null,
 status text not null default 'awaiting_payment' check(status in ('awaiting_payment','paid','active')), payment_order_id text, payment_id text, paid_at timestamptz, activated_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now()
);
create unique index if not exists shop_single_pending_upgrade on public.shop_upgrade_orders(user_id) where status in ('awaiting_payment','paid');
alter table public.shop_upgrade_orders enable row level security;
revoke all on public.shop_upgrade_orders from anon,authenticated;
grant all on public.shop_upgrade_orders to service_role;
alter table public.domain_registrar_contacts add column if not exists registrant_hash text;

alter table public.builder_sessions add column if not exists payment_confirmed_at timestamptz;
-- Enforce shop access for direct browser mutations, not only dashboard visibility.
create or replace function public.shop_owner_product_limit(_site_id uuid)
returns integer language plpgsql stable security definer set search_path=public as $$
declare owner_id uuid; p public.profiles%rowtype; max_products integer; legacy_key text;
begin
 select user_id into owner_id from public.sites where id=_site_id;
 if owner_id is null then return 0; end if;
 if exists(select 1 from public.user_roles where user_id=owner_id and role::text in ('admin','super_admin')) then return -1; end if;
 select * into p from public.profiles where id=owner_id;
 if p.ecom_addon and p.ecom_addon_status not in ('cancelled','expired','requested','paused') and (p.ecom_addon_expires_at is null or p.ecom_addon_expires_at>now()) then
   select coalesce(p.shop_product_limit,ecom_addon_product_limit,200) into max_products from public.site_settings where id=1;
   return greatest(coalesce(max_products,200),1);
 end if;
 select max(sp.ecom_product_limit) into max_products from public.service_orders so join public.service_plans sp on sp.id=so.plan_id where so.user_id=owner_id and so.status='active';
 if coalesce(max_products,0)>0 then return max_products; end if;
 legacy_key:=coalesce(nullif(trim(p.active_plan),''),nullif(trim(p.plan_tier),''),nullif(trim(p.plan),''),'trial');
 select max(ecom_product_limit) into max_products from public.plans where slug=legacy_key or name=legacy_key;
 if coalesce(max_products,0)>0 then return max_products; end if;
 if legacy_key='trial' and p.trial_ends_at>now() then return 20; end if;
 return 0;
end $$;
revoke all on function public.shop_owner_product_limit(uuid) from public;
grant execute on function public.shop_owner_product_limit(uuid) to authenticated,service_role;
do $$ declare tbl text; begin
 foreach tbl in array array['products','store_collections','store_coupons','store_payment_settings'] loop
  if to_regclass('public.'||tbl) is not null then
   execute format('drop policy if exists shop_entitled_insert on public.%I',tbl);
   execute format('create policy shop_entitled_insert on public.%I as restrictive for insert to authenticated with check (public.has_role(auth.uid(),''admin'') or public.has_role(auth.uid(),''super_admin'') or public.shop_owner_product_limit(site_id)<>0)',tbl);
   execute format('drop policy if exists shop_entitled_update on public.%I',tbl);
   execute format('create policy shop_entitled_update on public.%I as restrictive for update to authenticated using (public.has_role(auth.uid(),''admin'') or public.has_role(auth.uid(),''super_admin'') or public.shop_owner_product_limit(site_id)<>0) with check (public.has_role(auth.uid(),''admin'') or public.has_role(auth.uid(),''super_admin'') or public.shop_owner_product_limit(site_id)<>0)',tbl);
   execute format('drop policy if exists shop_entitled_delete on public.%I',tbl);
   execute format('create policy shop_entitled_delete on public.%I as restrictive for delete to authenticated using (public.has_role(auth.uid(),''admin'') or public.has_role(auth.uid(),''super_admin'') or public.shop_owner_product_limit(site_id)<>0)',tbl);
  end if;
 end loop;
end $$;
create or replace function public.enforce_shop_product_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare cap integer; used integer;
begin
 if auth.role()='service_role' or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin') then return new; end if;
 if tg_op='UPDATE' and new.site_id is not distinct from old.site_id then return new; end if;
 -- Serialize inserts per site so concurrent uploads cannot exceed the cap.
 perform 1 from public.sites where id=new.site_id for update;
 cap:=public.shop_owner_product_limit(new.site_id);
 if cap=0 then raise exception 'An active shop plan is required.'; end if;
 if cap>0 then select count(*) into used from public.products where site_id=new.site_id;
  if used>=cap then raise exception 'Your shop product limit has been reached.'; end if;
 end if;
 return new;
end $$;
drop trigger if exists shop_product_limit on public.products;
create trigger shop_product_limit before insert or update of site_id on public.products for each row execute function public.enforce_shop_product_limit();
-- Customers cannot grant themselves shop access or extend their own expiry via profile updates.
create or replace function app_private.protect_profile_entitlements()
returns trigger language plpgsql security definer set search_path=public,app_private as $$
begin
 if auth.uid() is not null and auth.role()<>'service_role'
 and not app_private.has_role(auth.uid(),'admin'::public.app_role)
 and not app_private.has_role(auth.uid(),'super_admin'::public.app_role)
 and (new.active_plan is distinct from old.active_plan or new.plan_tier is distinct from old.plan_tier or new.plan is distinct from old.plan or new.trial_ends_at is distinct from old.trial_ends_at or new.ecom_addon is distinct from old.ecom_addon or new.ecom_addon_status is distinct from old.ecom_addon_status or new.ecom_addon_expires_at is distinct from old.ecom_addon_expires_at or new.shop_product_limit is distinct from old.shop_product_limit)
 then raise exception 'Only an administrator or verified server payment can change plan access'; end if;
 return new;
end $$;
create or replace function app_private.protect_shop_entitlement_insert()
returns trigger language plpgsql security definer set search_path=public,app_private as $$
begin
 if auth.uid() is not null and auth.role()<>'service_role'
 and not app_private.has_role(auth.uid(),'admin'::public.app_role)
 and not app_private.has_role(auth.uid(),'super_admin'::public.app_role)
 and (new.ecom_addon or new.ecom_addon_status not in ('none','requested') or new.ecom_addon_expires_at is not null or new.shop_product_limit is not null)
 then raise exception 'Shop access must be activated by a verified server payment'; end if;
 return new;
end $$;
revoke all on function app_private.protect_shop_entitlement_insert() from public;
drop trigger if exists protect_shop_entitlement_insert on public.profiles;
create trigger protect_shop_entitlement_insert before insert on public.profiles for each row execute function app_private.protect_shop_entitlement_insert();

-- Policy acceptance is recorded server-side when a purchase is created.
alter table public.domain_orders add column if not exists policy_accepted_at timestamptz;
alter table public.domain_orders add column if not exists policy_version text;
alter table public.shop_upgrade_orders add column if not exists policy_accepted_at timestamptz;
alter table public.shop_upgrade_orders add column if not exists policy_version text;
