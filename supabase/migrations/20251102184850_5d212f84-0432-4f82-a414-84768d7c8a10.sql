-- Create user roles system
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can view all roles"
  on public.user_roles
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage roles"
  on public.user_roles
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Function to automatically assign admin role to specific emails
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Assign admin role to specific email addresses
  if new.email in ('mal4crypt404@gmail.com', 'mailwaro.online@gmail.com') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role)
    values (new.id, 'user');
  end if;
  return new;
end;
$$;

-- Trigger to assign role on user creation
create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute procedure public.handle_new_user_role();

-- Create website content table
create table public.website_content (
  id uuid primary key default gen_random_uuid(),
  section text not null unique,
  content jsonb not null,
  updated_at timestamp with time zone default now(),
  updated_by uuid references auth.users(id)
);

alter table public.website_content enable row level security;

-- RLS policies for website_content
create policy "Anyone can view website content"
  on public.website_content
  for select
  to authenticated
  using (true);

create policy "Admins can update website content"
  on public.website_content
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Trigger to update timestamp
create or replace function public.update_website_content_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger on_website_content_update
  before update on public.website_content
  for each row execute procedure public.update_website_content_timestamp();

-- Insert default website content
insert into public.website_content (section, content) values
('hero', '{"title": "Where Luxury Finds a Home", "subtitle": "Experience unparalleled elegance in Abuja''s finest residential properties"}'::jsonb),
('about', '{"title": "About WSL Realty", "description": "WSL Realty is dedicated to redefining residential luxury. We combine expertise, innovation, and exceptional service to help you find your dream home or manage your investments effortlessly. Our commitment to excellence ensures every client receives personalized attention and access to Abuja''s most prestigious properties."}'::jsonb),
('contact', '{"phone": "+234 901 088 3999", "email": "mailwaro.online@gmail.com", "address": "Gwarinpa, 900108, FCT Nigeria", "whatsapp": "2349010883999"}'::jsonb);