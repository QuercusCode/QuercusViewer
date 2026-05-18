-- Create profiles table if it doesn't exist and add plan column
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
    stripe_customer_id text,
    stripe_subscription_id text,
    plan_expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Auto-create a profile row on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (
        -- users cannot promote themselves — plan changes come from a service role / Edge Function
        (plan = (select plan from public.profiles where id = auth.uid()))
        or auth.role() = 'service_role'
    );
