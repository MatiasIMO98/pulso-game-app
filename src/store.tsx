import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { bubbleDuration, shouldSpeak, type AgentLevel, type Mood, type Priority, type Routine } from './agent/agent';
import { planTime, type TrainingPlan } from './agent/plan';
import { applyWorkout, emptyGroupXp, initialProgress, makeChallenge, refreshChallenge, type Progress, type Reward, type WorkoutInput } from './agent/progress';
import type { TrainingType } from './data/exercises';
import { MUSCLES, type GroupId, type MuscleId } from './data/muscles';
import { deleteEvent, insertEvents, insertMeasure, insertTemplate, insertWorkout, loadAll, saveSettings } from './lib/cloud';
import { cloudEnabled, signInWithGoogle, signOut, supabase, uuid } from './lib/supabase';
import { THEMES, type Theme } from './theme';

// ---------- Tipos ----------

export type User = { id: string; name: string; email: string; avatar?: string };

export type Settings = {
  theme: keyof typeof THEMES;
  agentName: string;
  agentLevel: AgentLevel;
  agentEnabled: boolean;
  agentSide: 'right' | 'left';
  agentInWorkout: boolean;
  soundEffects: boolean;
  voice: boolean;
  countdownBeep: boolean;
  volume: number; // 0-4
  vibration: boolean;
  units: 'metric' | 'imperial';
  notifReminders: boolean;
  notifMotivation: boolean;
  notifBalance: boolean;
  quietHours: boolean;
  /** Cuestionario de bienvenida completado (o saltado) */
  onboardingDone: boolean;
  /** Plan generado por el cuestionario */
  plan: TrainingPlan | null;
  /** Experiencia, nivel y reto actual (null hasta inicializarse) */
  progress: Progress | null;
};

export type WorkoutLog = { id: string; date: string; type: TrainingType; muscles: MuscleId[]; minutes: number; /** Fecha y hora ISO (created_at en la nube) */ at?: string };
export type CalendarEvent = { id: string; date: string; type: TrainingType; time: string; title: string; reminder: boolean };
export type RoutineTemplate = { id: string; name: string; type: TrainingType; weekdays: number[]; time: string };
export type MeasureKey = 'peso' | 'altura' | 'pecho' | 'biceps' | 'abdomen' | 'cadera' | 'muslo' | 'pantorrilla' | 'antebrazo' | 'hombros' | 'cuello';
export type MeasureEntry = { date: string; value: number };

export const MEASURES: { key: MeasureKey; label: string; unit: 'cm' | 'kg'; goodWhenDown: boolean }[] = [
  { key: 'peso', label: 'Peso', unit: 'kg', goodWhenDown: true },
  { key: 'altura', label: 'Altura', unit: 'cm', goodWhenDown: false },
  { key: 'cuello', label: 'Cuello', unit: 'cm', goodWhenDown: false },
  { key: 'hombros', label: 'Hombros', unit: 'cm', goodWhenDown: false },
  { key: 'pecho', label: 'Pectorales', unit: 'cm', goodWhenDown: false },
  { key: 'biceps', label: 'Bíceps', unit: 'cm', goodWhenDown: false },
  { key: 'antebrazo', label: 'Antebrazo', unit: 'cm', goodWhenDown: false },
  { key: 'abdomen', label: 'Abdomen', unit: 'cm', goodWhenDown: true },
  { key: 'cadera', label: 'Cadera', unit: 'cm', goodWhenDown: true },
  { key: 'muslo', label: 'Muslo', unit: 'cm', goodWhenDown: false },
  { key: 'pantorrilla', label: 'Pantorrilla', unit: 'cm', goodWhenDown: false },
];

export type AgentBubble = { id: number; text: string; mood: Mood };
export type AgentStatus = { phase: 'prep' | 'work' | 'rest' | 'set'; remaining: number; total: number; label: string } | null;

// ---------- Utilidades de fecha ----------

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// ---------- Datos de ejemplo (prototipo) ----------

const today = new Date();

const mockHistory: WorkoutLog[] = [
  [-1, 'fuerza', ['pectorales', 'triceps', 'deltoides'], 45],
  [-3, 'hiit', ['pectorales', 'abdominales', 'biceps'], 25],
  [-4, 'fuerza', ['biceps', 'triceps', 'antebrazos'], 40],
  [-6, 'tabata', ['abdominales', 'oblicuos', 'deltoides'], 16],
  [-8, 'fuerza', ['pectorales', 'deltoides', 'triceps'], 50],
  [-10, 'insanity', ['cuadriceps', 'abdominales', 'pectorales'], 30],
  [-12, 'fuerza', ['dorsales', 'biceps', 'trapecio'], 45],
  [-14, 'hiit', ['pectorales', 'abdominales', 'oblicuos'], 20],
  [-17, 'fuerza', ['biceps', 'triceps', 'pectorales'], 45],
  [-20, 'tabata', ['abdominales', 'gemelos'], 16],
  [-23, 'fuerza', ['cuadriceps', 'gluteo', 'isquios'], 50],
].map(([d, type, muscles, minutes], i) => ({
  id: `h${i}`,
  date: ymd(addDays(today, d as number)),
  type: type as TrainingType,
  muscles: muscles as MuscleId[],
  minutes: minutes as number,
}));

const mockEvents: CalendarEvent[] = [
  [0, 'hiit', '18:00', 'HIIT tren inferior'],
  [2, 'fuerza', '07:00', 'Fuerza · Espalda y bíceps'],
  [4, 'tabata', '19:30', 'Tabata core'],
  [6, 'insanity', '10:00', 'Insanity cuerpo completo'],
  [9, 'fuerza', '07:00', 'Fuerza · Piernas'],
].map(([d, type, time, title], i) => ({
  id: `e${i}`,
  date: ymd(addDays(today, d as number)),
  type: type as TrainingType,
  time: time as string,
  title: title as string,
  reminder: true,
}));

const series = (start: number, step: number): MeasureEntry[] =>
  [-120, -90, -60, -30, -2].map((d, i) => ({ date: ymd(addDays(today, d)), value: +(start + step * i).toFixed(1) }));

const mockMeasures: Record<MeasureKey, MeasureEntry[]> = {
  peso: series(82.4, -0.7),
  altura: series(176, 0),
  cuello: series(38, 0.1),
  hombros: series(112, 0.6),
  pecho: series(98, 0.8),
  biceps: series(33.5, 0.4),
  antebrazo: series(28, 0.2),
  abdomen: series(91, -1.1),
  cadera: series(100, -0.6),
  muslo: series(56, 0.3),
  pantorrilla: series(37, 0.1),
};

// ---------- Contexto ----------

type Ctx = {
  theme: Theme;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  /** cloud: Supabase configurado · demo: datos de ejemplo locales */
  mode: 'cloud' | 'demo';
  /** false mientras se recupera la sesión guardada */
  authReady: boolean;
  /** true mientras se descargan los datos del usuario */
  loadingData: boolean;
  /** Último error al sincronizar con la nube */
  syncError: string | null;
  user: User | null;
  loginGoogle: () => Promise<void>;
  loginDemo: () => void;
  logout: () => Promise<void>;
  history: WorkoutLog[];
  /** Registra un entrenamiento terminado, calcula XP, retos y niveles. Devuelve la recompensa. */
  completeWorkout: (w: WorkoutInput) => Reward | null;
  groupLoad: (days: number) => Record<GroupId, number>;
  muscleLoad: (days: number) => Record<MuscleId, number>;
  events: CalendarEvent[];
  addEvent: (e: Omit<CalendarEvent, 'id'>) => void;
  removeEvent: (id: string) => void;
  templates: RoutineTemplate[];
  addTemplate: (t: Omit<RoutineTemplate, 'id'>) => void;
  applyTemplate: (id: string, weeks: number) => number;
  /** Guarda el plan del cuestionario; con calendar=true crea rutinas semanales y 4 semanas de sesiones. Devuelve las sesiones creadas. */
  savePlan: (plan: TrainingPlan, calendar: boolean) => number;
  /** "Prefiero crearla yo": cierra el cuestionario sin plan */
  skipOnboarding: () => void;
  measures: Record<MeasureKey, MeasureEntry[]>;
  addMeasure: (k: MeasureKey, v: number) => void;
  routine: Routine | null;
  setRoutine: (r: Routine | null) => void;
  bubble: AgentBubble | null;
  say: (text: string, opts?: { mood?: Mood; priority?: Priority }) => void;
  dismissBubble: () => void;
  agentStatus: AgentStatus;
  setAgentStatus: (s: AgentStatus) => void;
};

const AppContext = createContext<Ctx | null>(null);

const DEFAULT_SETTINGS: Settings = {
  theme: 'energia',
  agentName: 'Nova',
  agentLevel: 3,
  agentEnabled: true,
  agentSide: 'right',
  agentInWorkout: true,
  soundEffects: true,
  voice: false,
  countdownBeep: true,
  volume: 3,
  vibration: true,
  units: 'metric',
  notifReminders: true,
  notifMotivation: true,
  notifBalance: true,
  quietHours: true,
  onboardingDone: false,
  plan: null,
  progress: null,
};

/** Equipo y exclusiones del plan, para generar retos acordes. */
const genOf = (s: Settings) => ({ equipment: s.plan?.equipment ?? [], exclude: s.plan?.exclude ?? [] });

/** Progreso de ejemplo para el modo demo: nivel 4 a medio camino, con brazos fuertes y glúteos olvidados. */
const demoProgress = (): Progress => {
  const groupXp = { ...emptyGroupXp(), pecho: 260, espalda: 90, hombros: 150, brazos: 430, core: 210, piernas: 120, gluteos: 25 };
  const at = (d: number) => addDays(new Date(), d).toISOString();
  return {
    xp: 760,
    level: 4,
    groupXp,
    challenge: makeChallenge(4, { groupXp, equipment: [], exclude: [] }),
    completed: [
      { id: 'd1', title: 'Completa tu primer entrenamiento', level: 1, at: at(-23) },
      { id: 'd2', title: 'Incluye en tu rutina: Sentadillas, Plancha, Flexiones', level: 2, at: at(-14) },
      { id: 'd3', title: 'Acumula 55 minutos de entrenamiento', level: 3, at: at(-6) },
    ],
  };
};

const mockTemplates: RoutineTemplate[] = [
  { id: 't1', name: 'Fuerza tren superior', type: 'fuerza', weekdays: [1, 4], time: '07:00' },
  { id: 't2', name: 'HIIT quemagrasa', type: 'hiit', weekdays: [3], time: '18:30' },
];

const emptyMeasures = () => Object.fromEntries(MEASURES.map((m) => [m.key, []])) as unknown as Record<MeasureKey, MeasureEntry[]>;

const userFromSession = (s: Session): User => {
  const meta = s.user.user_metadata ?? {};
  const email = s.user.email ?? '';
  return { id: s.user.id, email, name: meta.full_name ?? meta.name ?? email.split('@')[0] ?? 'Atleta', avatar: meta.avatar_url ?? meta.picture };
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const mode: Ctx['mode'] = cloudEnabled ? 'cloud' : 'demo';
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [loadingData, setLoadingData] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [measures, setMeasures] = useState<Record<MeasureKey, MeasureEntry[]>>(emptyMeasures);
  const settingsLoaded = useRef(false);

  /** Ejecuta una escritura en la nube sin bloquear la interfaz; guarda el error si falla. */
  const sync = useCallback((job: () => Promise<unknown>) => {
    if (!cloudEnabled) return;
    job()
      .then(() => setSyncError(null))
      .catch((e: Error) => setSyncError(e.message));
  }, []);

  // Sesión: recuperar la guardada y escuchar cambios (entrar / salir / refresco de token)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? userFromSession(data.session) : null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((prev) => {
        const next = session ? userFromSession(session) : null;
        return prev?.id === next?.id ? prev : next;
      });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Al entrar: descargar los datos del usuario
  const userId = user?.id;
  useEffect(() => {
    if (!cloudEnabled || !userId) return;
    let cancelled = false;
    settingsLoaded.current = false;
    setLoadingData(true);
    loadAll()
      .then((d) => {
        if (cancelled) return;
        // Cuenta nueva = sin ajustes guardados → mostrar cuestionario de bienvenida.
        // Cuentas anteriores al cuestionario (ajustes sin ese campo) no lo ven.
        setSettings({ ...DEFAULT_SETTINGS, ...(d.settings ?? {}), onboardingDone: d.settings ? (d.settings.onboardingDone ?? true) : false });
        setHistory(d.history);
        setEvents(d.events);
        setTemplates(d.templates);
        setMeasures({ ...emptyMeasures(), ...d.measures });
        setSyncError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setSyncError(e.message);
        // Si no se pudieron leer los datos, no forzar el cuestionario
        setSettings((s) => ({ ...s, onboardingDone: true }));
      })
      .finally(() => {
        if (cancelled) return;
        settingsLoaded.current = true;
        setLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Guardar ajustes en la nube (agrupando cambios seguidos)
  useEffect(() => {
    if (!cloudEnabled || !userId || !settingsLoaded.current) return;
    const t = setTimeout(() => sync(() => saveSettings(userId, settings)), 800);
    return () => clearTimeout(t);
  }, [settings, userId, sync]);

  // Inicializar el progreso (nivel 1 + primer reto) cuando aún no existe
  useEffect(() => {
    if (!userId || loadingData || (cloudEnabled && !settingsLoaded.current)) return;
    setSettings((s) => (s.progress ? s : { ...s, progress: initialProgress(genOf(s)) }));
  }, [userId, loadingData, settings.progress]);

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [bubble, setBubble] = useState<AgentBubble | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const dismissBubble = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setBubble(null);
  }, []);

  const say = useCallback<Ctx['say']>((text, opts) => {
    const s = settingsRef.current;
    if (!s.agentEnabled || !shouldSpeak(s.agentLevel, opts?.priority ?? 'normal')) return;
    if (timer.current) clearTimeout(timer.current);
    setBubble({ id: Date.now(), text, mood: opts?.mood ?? 'happy' });
    timer.current = setTimeout(() => setBubble(null), bubbleDuration(s.agentLevel));
  }, []);

  const value = useMemo<Ctx>(() => {
    const muscleLoad = (days: number) => {
      const from = ymd(addDays(new Date(), -days));
      const load = Object.fromEntries(Object.keys(MUSCLES).map((m) => [m, 0])) as Record<MuscleId, number>;
      history.filter((h) => h.date >= from).forEach((h) => h.muscles.forEach((m) => (load[m] += h.minutes / h.muscles.length)));
      return load;
    };
    const groupLoad = (days: number) => {
      const ml = muscleLoad(days);
      const g = { pecho: 0, espalda: 0, hombros: 0, brazos: 0, core: 0, piernas: 0, gluteos: 0 } as Record<GroupId, number>;
      (Object.keys(ml) as MuscleId[]).forEach((m) => (g[MUSCLES[m].group] += ml[m]));
      return g;
    };
    return {
      theme: THEMES[settings.theme],
      settings,
      updateSettings: (p) => setSettings((s) => ({ ...s, ...p })),
      mode,
      authReady,
      loadingData,
      syncError,
      user,
      loginGoogle: async () => {
        await signInWithGoogle();
      },
      loginDemo: () => {
        setSettings({ ...DEFAULT_SETTINGS, progress: demoProgress() });
        setHistory(mockHistory);
        setEvents(mockEvents);
        setTemplates(mockTemplates);
        setMeasures(mockMeasures);
        setUser({ id: 'demo', name: 'Atleta', email: 'modo demo' });
      },
      logout: async () => {
        if (cloudEnabled) await signOut();
        setUser(null);
        setHistory([]);
        setEvents([]);
        setTemplates([]);
        setMeasures(emptyMeasures());
        setRoutine(null);
      },
      history,
      completeWorkout: (w) => {
        const s = settingsRef.current;
        if (!s.progress) return null;
        const now = new Date();
        const muscles = [...new Set(w.items.filter((_, i) => (w.done[i] ?? 0) > 0).flatMap((it) => it.exercise.muscles))];
        const row: WorkoutLog = { id: uuid(), date: ymd(now), at: now.toISOString(), type: w.type, muscles, minutes: w.minutes };
        const streak = history.some((h) => h.date === ymd(addDays(now, -1)));
        const ctxAfter = { workouts: [row, ...history], measureDates: Object.values(measures).flatMap((l) => l.map((e) => e.date)) };
        const { progress, reward } = applyWorkout(s.progress, { ...w, streak }, ctxAfter, genOf(s));
        setHistory((h) => [row, ...h]);
        setSettings((prev) => ({ ...prev, progress }));
        sync(() => insertWorkout(row));
        return reward;
      },
      groupLoad,
      muscleLoad,
      events,
      addEvent: (e) => {
        const row = { ...e, id: uuid() };
        setEvents((ev) => [...ev, row]);
        sync(() => insertEvents([row]));
      },
      removeEvent: (id) => {
        setEvents((ev) => ev.filter((e) => e.id !== id));
        sync(() => deleteEvent(id));
      },
      templates,
      addTemplate: (t) => {
        const row = { ...t, id: uuid() };
        setTemplates((ts) => [...ts, row]);
        sync(() => insertTemplate(row));
      },
      savePlan: (plan, calendar) => {
        setSettings((s) => ({ ...s, plan, onboardingDone: true }));
        if (!calendar) return 0;
        const time = planTime(plan);
        const newTemplates: RoutineTemplate[] = plan.schedule.map((d) => ({ id: uuid(), name: d.label, type: d.type, weekdays: [d.weekday], time }));
        const add: CalendarEvent[] = [];
        for (let i = 0; i < 28; i++) {
          const d = addDays(new Date(), i);
          const day = plan.schedule.find((p) => p.weekday === d.getDay());
          if (day) add.push({ id: uuid(), date: ymd(d), type: day.type, time, title: day.label, reminder: true });
        }
        setTemplates((ts) => [...ts, ...newTemplates]);
        setEvents((ev) => [...ev, ...add]);
        sync(async () => {
          for (const t of newTemplates) await insertTemplate(t);
          await insertEvents(add);
        });
        return add.length;
      },
      skipOnboarding: () => setSettings((s) => ({ ...s, onboardingDone: true })),
      applyTemplate: (id, weeks) => {
        const t = templates.find((x) => x.id === id);
        if (!t) return 0;
        const add: CalendarEvent[] = [];
        for (let i = 0; i < weeks * 7; i++) {
          const d = addDays(new Date(), i);
          const date = ymd(d);
          const exists = events.some((e) => e.date === date && e.title === t.name && e.time === t.time);
          if (t.weekdays.includes(d.getDay()) && !exists) add.push({ id: uuid(), date, type: t.type, time: t.time, title: t.name, reminder: true });
        }
        setEvents((ev) => [...ev, ...add]);
        sync(() => insertEvents(add));
        return add.length;
      },
      measures,
      addMeasure: (k, v) => {
        const entry = { date: ymd(new Date()), value: v };
        setMeasures((m) => ({ ...m, [k]: [...m[k], entry] }));
        sync(() => insertMeasure(k, entry));
        // Un reto puede pedir registrar medidas
        const measureDates = [...Object.values(measures).flatMap((l) => l.map((e) => e.date)), entry.date];
        setSettings((prev) =>
          prev.progress ? { ...prev, progress: refreshChallenge(prev.progress, { workouts: history, measureDates, groupXp: prev.progress.groupXp }, genOf(prev)) } : prev,
        );
      },
      routine,
      setRoutine,
      bubble,
      say,
      dismissBubble,
      agentStatus,
      setAgentStatus,
    };
  }, [mode, authReady, loadingData, syncError, settings, user, history, events, templates, measures, routine, bubble, say, dismissBubble, agentStatus, sync]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
};
