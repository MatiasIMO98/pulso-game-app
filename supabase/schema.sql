-- Pulso · esquema de base de datos para Supabase
-- Ejecutar UNA vez en: Supabase > SQL Editor > New query > pegar > Run.
-- Cada tabla activa seguridad por fila (RLS) y una política: un usuario solo lee y modifica sus propias filas.
-- No borra nada: solo crea tablas, índices y políticas.

-- ---------- Tablas ----------

-- Ajustes de la app (tema, agente, plan, progreso/XP…) guardados como JSON
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;

-- Entrenamientos completados
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('tabata', 'hiit', 'insanity', 'fuerza')),
  muscles text[] not null default '{}',
  minutes integer not null check (minutes >= 0),
  created_at timestamptz not null default now()
);
alter table public.workouts enable row level security;

-- Entrenamientos agendados en el calendario
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  type text not null check (type in ('tabata', 'hiit', 'insanity', 'fuerza')),
  time text not null,
  title text not null,
  reminder boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.calendar_events enable row level security;

-- Rutinas semanales (plantillas que se aplican al calendario)
create table if not exists public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('tabata', 'hiit', 'insanity', 'fuerza')),
  weekdays smallint[] not null default '{}',
  time text not null,
  created_at timestamptz not null default now()
);
alter table public.routine_templates enable row level security;

-- Medidas corporales (una fila por registro)
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  date date not null,
  value numeric(6, 1) not null,
  created_at timestamptz not null default now()
);
alter table public.measurements enable row level security;

-- ---------- Índices ----------

create index if not exists workouts_user_date on public.workouts (user_id, date);
create index if not exists events_user_date on public.calendar_events (user_id, date);
create index if not exists measurements_user_key on public.measurements (user_id, key, date);
create index if not exists templates_user on public.routine_templates (user_id);

-- ---------- Políticas: cada usuario solo accede a sus filas ----------

create policy "own rows" on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows" on public.workouts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows" on public.calendar_events for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows" on public.routine_templates for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own rows" on public.measurements for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
