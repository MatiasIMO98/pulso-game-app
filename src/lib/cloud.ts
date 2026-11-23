/**
 * Acceso a los datos del usuario en Supabase.
 * Las filas se filtran solas por usuario gracias a las reglas RLS de supabase/schema.sql.
 */
import type { CalendarEvent, MeasureEntry, MeasureKey, RoutineTemplate, Settings, WorkoutLog } from '../store';
import { supabase } from './supabase';

const db = () => {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
};

/** Lanza el error de Supabase para que quien llama lo muestre. */
function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export type CloudData = {
  settings: Partial<Settings> | null;
  history: WorkoutLog[];
  events: CalendarEvent[];
  templates: RoutineTemplate[];
  measures: Partial<Record<MeasureKey, MeasureEntry[]>>;
};

export async function loadAll(): Promise<CloudData> {
  const s = db();
  const [settings, workouts, events, templates, measurements] = await Promise.all([
    s.from('user_settings').select('data').maybeSingle(),
    s.from('workouts').select('id, date, type, muscles, minutes, at:created_at').order('date', { ascending: false }),
    s.from('calendar_events').select('id, date, type, time, title, reminder').order('date'),
    s.from('routine_templates').select('id, name, type, weekdays, time').order('created_at'),
    s.from('measurements').select('key, date, value').order('date').order('created_at'),
  ]);

  const measures: CloudData['measures'] = {};
  for (const m of check(measurements) ?? []) {
    const k = m.key as MeasureKey;
    (measures[k] ??= []).push({ date: m.date, value: Number(m.value) });
  }

  return {
    settings: (check(settings)?.data as Partial<Settings>) ?? null,
    history: (check(workouts) ?? []) as WorkoutLog[],
    events: (check(events) ?? []) as CalendarEvent[],
    templates: (check(templates) ?? []) as RoutineTemplate[],
    measures,
  };
}

export async function saveSettings(userId: string, data: Settings) {
  check(await db().from('user_settings').upsert({ user_id: userId, data, updated_at: new Date().toISOString() }));
}

export async function insertWorkout(w: WorkoutLog) {
  const { at: _at, ...row } = w; // created_at lo pone la base de datos
  check(await db().from('workouts').insert(row));
}

export async function insertEvents(e: CalendarEvent[]) {
  if (e.length) check(await db().from('calendar_events').upsert(e));
}

export async function deleteEvent(id: string) {
  check(await db().from('calendar_events').delete().eq('id', id));
}

export async function insertTemplate(t: RoutineTemplate) {
  check(await db().from('routine_templates').insert(t));
}

export async function insertMeasure(key: MeasureKey, entry: MeasureEntry) {
  check(await db().from('measurements').insert({ key, date: entry.date, value: entry.value }));
}
