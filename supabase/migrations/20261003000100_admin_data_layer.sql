-- Admin data layer: real tables for lists, enquiries and media, plus staff roles.
-- Safe to run on the live database: existing JSON content is imported, nothing is dropped.

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('admin', 'editor')
  )
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Close the admin takeover hole: nobody becomes admin just by signing up
--    with a particular email. Admins are created from the dashboard only.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Content tables
-- ---------------------------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 150),
  location text not null default '' check (char_length(location) <= 200),
  description text not null default '' check (char_length(description) <= 5000),
  price text not null default 'Price on request' check (char_length(price) <= 100),
  status text not null default 'available' check (status in ('available', 'under_construction', 'sold')),
  bedrooms int check (bedrooms is null or bedrooms between 0 and 50),
  bathrooms int check (bathrooms is null or bathrooms between 0 and 50),
  size_sqm int check (size_sqm is null or size_sqm between 0 and 100000),
  images text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.furniture (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 150),
  location text not null default '' check (char_length(location) <= 200),
  description text not null default '' check (char_length(description) <= 5000),
  price text not null default '' check (char_length(price) <= 100),
  in_stock boolean not null default true,
  images text[] not null default '{}',
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  image text not null default '',
  caption text not null default '' check (char_length(caption) <= 200),
  category text not null default 'Builds' check (category in ('Builds', 'Furniture')),
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 150),
  location text not null default '',
  summary text not null default '',
  current_stage int not null default 0 check (current_stage between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_stages (
  project_slug text not null references public.projects(slug) on delete cascade,
  stage int not null check (stage between 0 and 5),
  title text not null,
  note text not null default '' check (char_length(note) <= 2000),
  image text not null default '',
  updated_at timestamptz not null default now(),
  primary key (project_slug, stage)
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_slug text not null default 'arya-luxe' references public.projects(slug) on delete cascade,
  stage int not null default 0 check (stage between 0 and 5),
  title text not null default '',
  body text not null default '' check (char_length(body) <= 5000),
  images text[] not null default '{}',
  posted_on date not null default current_date,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  phone text not null check (char_length(btrim(phone)) between 5 and 30),
  email text check (email is null or char_length(email) <= 255),
  interest text check (interest is null or char_length(interest) <= 200),
  message text check (message is null or char_length(message) <= 1000),
  source text not null default 'contact_form' check (char_length(source) <= 120),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  notes text check (notes is null or char_length(notes) <= 2000),
  handled_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  url text not null,
  name text not null default '',
  mime text,
  size_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists properties_sort_idx on public.properties (sort_order);
create index if not exists furniture_sort_idx on public.furniture (sort_order);
create index if not exists jobs_sort_idx on public.jobs (sort_order);
create index if not exists project_updates_posted_idx on public.project_updates (posted_on desc);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_status_idx on public.enquiries (status);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['properties','furniture','jobs','projects','project_stages','project_updates','enquiries']
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Row level security
-- ---------------------------------------------------------------------------
alter table public.properties enable row level security;
alter table public.furniture enable row level security;
alter table public.jobs enable row level security;
alter table public.projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.project_updates enable row level security;
alter table public.enquiries enable row level security;
alter table public.media enable row level security;

-- Visitors read published content only
drop policy if exists "Public read published properties" on public.properties;
create policy "Public read published properties" on public.properties for select to anon, authenticated using (published);
drop policy if exists "Public read published furniture" on public.furniture;
create policy "Public read published furniture" on public.furniture for select to anon, authenticated using (published);
drop policy if exists "Public read published jobs" on public.jobs;
create policy "Public read published jobs" on public.jobs for select to anon, authenticated using (published);
drop policy if exists "Public read published updates" on public.project_updates;
create policy "Public read published updates" on public.project_updates for select to anon, authenticated using (published);
drop policy if exists "Public read projects" on public.projects;
create policy "Public read projects" on public.projects for select to anon, authenticated using (true);
drop policy if exists "Public read project stages" on public.project_stages;
create policy "Public read project stages" on public.project_stages for select to anon, authenticated using (true);

-- Staff (admin or editor) manage everything, including drafts
drop policy if exists "Staff manage properties" on public.properties;
create policy "Staff manage properties" on public.properties for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "Staff manage furniture" on public.furniture;
create policy "Staff manage furniture" on public.furniture for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "Staff manage jobs" on public.jobs;
create policy "Staff manage jobs" on public.jobs for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "Staff manage projects" on public.projects;
create policy "Staff manage projects" on public.projects for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "Staff manage project stages" on public.project_stages;
create policy "Staff manage project stages" on public.project_stages for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "Staff manage project updates" on public.project_updates;
create policy "Staff manage project updates" on public.project_updates for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "Staff manage media" on public.media;
create policy "Staff manage media" on public.media for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Enquiries: anyone can submit a new one, only staff can read or change them
drop policy if exists "Anyone can submit an enquiry" on public.enquiries;
create policy "Anyone can submit an enquiry" on public.enquiries for insert to anon, authenticated
  with check (status = 'new' and notes is null and handled_by is null);
drop policy if exists "Staff read enquiries" on public.enquiries;
create policy "Staff read enquiries" on public.enquiries for select to authenticated using (public.is_staff(auth.uid()));
drop policy if exists "Staff update enquiries" on public.enquiries;
create policy "Staff update enquiries" on public.enquiries for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
drop policy if exists "Staff delete enquiries" on public.enquiries;
create policy "Staff delete enquiries" on public.enquiries for delete to authenticated using (public.is_staff(auth.uid()));

-- website_content: editors can write too
drop policy if exists "Admins can update website content" on public.website_content;
drop policy if exists "Staff manage website content" on public.website_content;
create policy "Staff manage website content" on public.website_content for all to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Storage: editors can manage site images too
drop policy if exists "Admins can upload property images" on storage.objects;
drop policy if exists "Admins can update property images" on storage.objects;
drop policy if exists "Admins can delete property images" on storage.objects;
drop policy if exists "Staff upload site images" on storage.objects;
create policy "Staff upload site images" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images' and public.is_staff(auth.uid()));
drop policy if exists "Staff update site images" on storage.objects;
create policy "Staff update site images" on storage.objects for update to authenticated
  using (bucket_id = 'property-images' and public.is_staff(auth.uid()));
drop policy if exists "Staff delete site images" on storage.objects;
create policy "Staff delete site images" on storage.objects for delete to authenticated
  using (bucket_id = 'property-images' and public.is_staff(auth.uid()));

-- Table privileges (RLS above still decides who can do what)
grant select on public.properties, public.furniture, public.jobs, public.projects, public.project_stages, public.project_updates to anon, authenticated;
grant insert, update, delete on public.properties, public.furniture, public.jobs, public.projects, public.project_stages, public.project_updates to authenticated;
grant insert on public.enquiries to anon, authenticated;
grant select, update, delete on public.enquiries to authenticated;
grant select, insert, update, delete on public.media to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Import what the old JSON blobs already hold (if anything), then seed
--    the current site defaults only where a table is still empty.
-- ---------------------------------------------------------------------------
insert into public.properties (slug, title, location, description, price, images, sort_order)
select
  coalesce(
    nullif(p->>'slug', ''),
    nullif(trim(both '-' from regexp_replace(lower(coalesce(p->>'title', '')), '[^a-z0-9]+', '-', 'g')), ''),
    'property-' || t.ord
  ),
  coalesce(nullif(p->>'title', ''), 'Untitled property'),
  coalesce(p->>'location', ''),
  coalesce(p->>'description', ''),
  coalesce(nullif(p->>'price', ''), 'Price on request'),
  case when coalesce(p->>'image', '') = '' or p->>'image' like '/src/%' then '{}'::text[] else array[p->>'image'] end,
  t.ord::int
from (
  select content from public.website_content
  where section = 'properties' and jsonb_typeof(content) = 'array'
) w
cross join lateral jsonb_array_elements(w.content) with ordinality as t(p, ord)
on conflict (slug) do nothing;

insert into public.furniture (title, location, description, price, images, sort_order)
select
  coalesce(nullif(p->>'title', ''), 'Untitled item'),
  coalesce(p->>'location', ''),
  coalesce(p->>'description', ''),
  coalesce(p->>'price', ''),
  coalesce(array(
    select x from jsonb_array_elements_text(
      case when jsonb_typeof(p->'images') = 'array' then p->'images' else '[]'::jsonb end
    ) x where x not like '/src/%'
  ), '{}'::text[]),
  t.ord::int
from (
  select content from public.website_content
  where section = 'furniture' and jsonb_typeof(content) = 'array'
) w
cross join lateral jsonb_array_elements(w.content) with ordinality as t(p, ord)
where not exists (select 1 from public.furniture);

insert into public.properties (slug, title, location, description, price, status, bedrooms, sort_order, featured)
select * from (values
  ('arya-luxe', 'Arya Luxe', 'Gwarinpa, Abuja', 'A private collection of contemporary residences currently under construction.', 'Price on request', 'under_construction', null::int, 0, true),
  ('4-bedroom-smart-home', '4 Bedroom Smart Home', 'Gwarinpa, Abuja', 'A fully automated family home with premium finishes throughout.', '₦95,000,000', 'available', 4, 1, true),
  ('the-palm-residence', 'The Palm Residence', 'Jabi, Abuja', 'A 3-bedroom apartment designed around light and calm.', '₦72,000,000', 'available', 3, 2, true)
) as v(slug, title, location, description, price, status, bedrooms, sort_order, featured)
where not exists (select 1 from public.properties);

insert into public.furniture (title, location, description, price, sort_order)
select * from (values
  ('Twin Set Bed', 'Abuja', 'Handcrafted twin bed set.', '₦2,500,000', 0),
  ('Royalty Dining Set', 'Abuja', 'A statement dining set for gatherings.', '₦2,500,000', 1),
  ('Exquisite Luxury Cushions', 'Abuja', 'Plush, tailored luxury cushions.', '₦2,500,000', 2)
) as v(title, location, description, price, sort_order)
where not exists (select 1 from public.furniture);

insert into public.jobs (category, sort_order)
select * from (values
  ('Builds', 0), ('Furniture', 1), ('Builds', 2), ('Furniture', 3), ('Builds', 4), ('Furniture', 5)
) as v(category, sort_order)
where not exists (select 1 from public.jobs);

insert into public.projects (slug, name, location, summary, current_stage)
values ('arya-luxe', 'Arya Luxe', 'Gwarinpa, Abuja', 'A private collection of contemporary residences, built with clarity, quality and a long view.', 1)
on conflict (slug) do nothing;

insert into public.project_stages (project_slug, stage, title)
values
  ('arya-luxe', 0, 'Foundation'),
  ('arya-luxe', 1, 'Block Work'),
  ('arya-luxe', 2, 'Ceiling'),
  ('arya-luxe', 3, 'Windows'),
  ('arya-luxe', 4, 'Finishing'),
  ('arya-luxe', 5, 'Handover')
on conflict (project_slug, stage) do nothing;

insert into public.project_updates (project_slug, stage, title, body, posted_on)
select * from (values
  ('arya-luxe', 1, 'Block work completed through level 2', 'Block work completed through level 2. The structure is taking shape with clean lines and generous light.', date '2025-09-14'),
  ('arya-luxe', 0, 'Foundation completed and inspected', 'Foundation completed and inspected. Ground works signed off ahead of schedule.', date '2025-07-20')
) as v(project_slug, stage, title, body, posted_on)
where not exists (select 1 from public.project_updates);

-- ---------------------------------------------------------------------------
-- 6. Replace the untouched old "WSL Realty" seed copy with the current wording.
--    Rows an admin has already edited are left alone.
-- ---------------------------------------------------------------------------
update public.website_content
set content = jsonb_build_object(
  'title', 'Luxury homes, built with craft',
  'subtitle', 'We develop considered spaces for living well — from the first line on paper to the final finish.')
where section = 'hero' and content->>'title' = 'Where Luxury Finds a Home';

update public.website_content
set content = jsonb_build_object(
  'title', 'About WSL Properties',
  'description', 'WSL Properties is a Nigerian property development company with roots in making. We bring the same discipline, detail and care to every home we deliver.')
where section = 'about' and content->>'title' = 'About WSL Realty';
