-- Create profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  full_name text,
  phone text,
  oab text,
  specialization text,
  avatar_url text,
  signature text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  primary key (id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Users can view their own profile" 
on public.profiles 
for select 
using (auth.uid() = id);

create policy "Users can update their own profile" 
on public.profiles 
for update 
using (auth.uid() = id);

create policy "Users can insert their own profile" 
on public.profiles 
for insert 
with check (auth.uid() = id);

-- Create function to update timestamps
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create trigger for automatic timestamp updates
create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

-- Create trigger to automatically create profile on signup
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();