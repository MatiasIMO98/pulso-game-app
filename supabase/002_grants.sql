-- Pulso · permisos para usuarios con sesión iniciada
-- Ejecutar una vez en: Supabase > SQL Editor > New query > pegar > Run.
--
-- Los proyectos nuevos de Supabase no dan permisos automáticos sobre tablas nuevas.
-- Esto permite al rol "authenticated" (usuarios que entraron con Google) usar las tablas;
-- las políticas RLS de schema.sql siguen limitando cada usuario a SUS propias filas.
-- El rol "anon" (sin sesión) NO recibe ningún permiso.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.user_settings,
  public.workouts,
  public.calendar_events,
  public.routine_templates,
  public.measurements
to authenticated;
