/**
 * Sistema de experiencia de Pulso.
 *
 * - El ATLETA (tú) tiene un nivel general (1–50) y cada GRUPO MUSCULAR tiene su nivel (1–10).
 * - Se gana XP por cada intervalo / serie completada; el XP también se reparte entre los grupos trabajados.
 * - Para subir de nivel hacen falta DOS cosas: el XP del umbral y superar el RETO del nivel.
 *   Los retos rotan entre: completar una rutina concreta, incluir ciertos ejercicios, o cumplir un requisito.
 * - Nova evoluciona (accesorios) al alcanzar ciertos niveles del atleta.
 *
 * Todo es lógica pura (sin React) para poder probarla y, más adelante, delegar los retos a Claude.
 */
import { EXERCISES, typeInfo, type Equipment, type TrainingType } from '../data/exercises';
import { GROUPS, MUSCLES, musclesOfGroup, type GroupId } from '../data/muscles';
import { generateRoutine, type AgentLevel, type Routine, type RoutineItem } from './agent';

// ---------- Curvas de nivel ----------

export const MAX_LEVEL = 50;
export const MAX_GROUP_LEVEL = 10;

/** XP total acumulado necesario para alcanzar el nivel n. Nv2: 100 · Nv5: 919 · Nv10: 3.366 · Nv20: 11.100 */
export const xpForLevel = (n: number) => (n <= 1 ? 0 : Math.round(100 * Math.pow(n - 1, 1.6)));

/** XP de grupo necesario para el nivel n. Nv2: 60 · Nv5: 727 · Nv10: 3.130 */
export const groupXpForLevel = (n: number) => (n <= 1 ? 0 : Math.round(60 * Math.pow(n - 1, 1.8)));

export const groupLevel = (xp: number) => {
  let l = 1;
  while (l < MAX_GROUP_LEVEL && xp >= groupXpForLevel(l + 1)) l++;
  return l;
};

export const TITLES: { from: number; name: string }[] = [
  { from: 1, name: 'Novato' },
  { from: 3, name: 'Aprendiz' },
  { from: 5, name: 'Constante' },
  { from: 10, name: 'Atleta' },
  { from: 15, name: 'Guerrero' },
  { from: 20, name: 'Élite' },
  { from: 30, name: 'Titán' },
  { from: 40, name: 'Leyenda' },
];
export const titleFor = (level: number) => [...TITLES].reverse().find((t) => level >= t.from)!.name;

export const GROUP_TIERS = ['Inicial', 'Despierto', 'Activo', 'Firme', 'Fuerte', 'Sólido', 'Potente', 'Forjado', 'Imparable', 'Maestro'];

// ---------- Evolución de Nova ----------

export const NOVA_STAGES: { level: number; name: string; unlock: string; icon: string }[] = [
  { level: 1, name: 'Chispa', unlock: 'Tu compañera de entrenamiento', icon: 'star-four-points-outline' },
  { level: 5, name: 'Llama', unlock: 'Cinta deportiva', icon: 'fire' },
  { level: 10, name: 'Pulso', unlock: 'Aura de energía', icon: 'pulse' },
  { level: 20, name: 'Titán', unlock: 'Corona de campeón', icon: 'crown-outline' },
  { level: 30, name: 'Leyenda', unlock: 'Accesorios dorados', icon: 'trophy-outline' },
];
/** Etapa de Nova (0–4) según el nivel del atleta. */
export const novaStage = (level: number) => NOVA_STAGES.filter((s) => level >= s.level).length - 1;

// ---------- Retos ----------

export type Requirement =
  | { metric: 'sessions'; target: number }
  | { metric: 'days'; target: number }
  | { metric: 'minutes'; target: number }
  | { metric: 'typeSessions'; target: number; type: TrainingType }
  | { metric: 'groupLevel'; target: number; group: GroupId }
  | { metric: 'measure'; target: number }
  | { metric: 'noSkip'; target: number };

export type Challenge = {
  id: string;
  /** Nivel actual; superarlo permite pasar a level + 1 */
  level: number;
  kind: 'routine' | 'exercises' | 'requirement';
  title: string;
  desc: string;
  startedAt: string;
  done: boolean;
  routine?: { type: TrainingType; groups: GroupId[]; minutes: number };
  exercises?: string[];
  requirement?: Requirement;
};

export type Progress = {
  xp: number;
  level: number;
  groupXp: Record<GroupId, number>;
  challenge: Challenge;
  /** Retos superados (historial) */
  completed: { id: string; title: string; level: number; at: string }[];
};

export const emptyGroupXp = () => Object.fromEntries(GROUPS.map((g) => [g.id, 0])) as Record<GroupId, number>;

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const uid = () => Math.random().toString(36).slice(2, 10);
const groupName = (g: GroupId) => GROUPS.find((x) => x.id === g)!.name;

/** Grupo con menos XP (para retos que corrigen desequilibrios). */
export const weakestGroup = (gx: Record<GroupId, number>, avoid: GroupId[] = []) =>
  [...GROUPS].filter((g) => !avoid.includes(g.id)).sort((a, b) => gx[a.id] - gx[b.id])[0].id;

type GenCtx = { groupXp: Record<GroupId, number>; equipment: Equipment[]; exclude: string[] };

/** Crea el reto para pasar del nivel `level` al siguiente. */
export function makeChallenge(level: number, ctx: GenCtx): Challenge {
  const base = { id: uid(), level, startedAt: new Date().toISOString(), done: false };
  const weak = weakestGroup(ctx.groupXp);

  if (level === 1) {
    return { ...base, kind: 'requirement', title: 'Completa tu primer entrenamiento', desc: 'Cualquier rutina cuenta. ¡El primer paso es el más importante!', requirement: { metric: 'sessions', target: 1 } };
  }

  const kind = (['routine', 'exercises', 'requirement'] as const)[level % 3];

  if (kind === 'routine') {
    const types: TrainingType[] = level >= 6 ? ['tabata', 'hiit', 'fuerza', 'insanity'] : ['tabata', 'hiit', 'fuerza'];
    const type = types[Math.floor(level / 3) % types.length];
    const groups: GroupId[] = weak === 'core' ? ['core', 'gluteos'] : [weak, 'core'];
    const minutes = Math.min(45, 15 + level * 2);
    return {
      ...base,
      kind,
      title: `Completa la rutina «${typeInfo(type).name} · ${groups.map(groupName).join(' y ')}»`,
      desc: `Rutina de reto de ${minutes} min sin saltar ningún ejercicio. Enfocada en tu grupo menos trabajado.`,
      routine: { type, groups, minutes },
    };
  }

  if (kind === 'exercises') {
    const n = level >= 10 ? 4 : 3;
    const ok = EXERCISES.filter((e) => (e.equipment === 'ninguno' || ctx.equipment.includes(e.equipment)) && !ctx.exclude.includes(e.name));
    const forWeak = ok.filter((e) => e.muscles.some((m) => MUSCLES[m].group === weak)).sort(() => Math.random() - 0.5);
    const rest = ok.filter((e) => !forWeak.includes(e)).sort(() => Math.random() - 0.5);
    const names = [...forWeak.slice(0, n - 1), ...rest].slice(0, n).map((e) => e.name);
    return {
      ...base,
      kind,
      title: `Incluye en tu rutina: ${names.join(', ')}`,
      desc: 'Complétalos todos en un mismo entrenamiento (al menos una ronda o serie de cada uno).',
      exercises: names,
    };
  }

  const reqs: Requirement[] = [
    { metric: 'days', target: Math.min(5, 2 + Math.floor(level / 6)) },
    { metric: 'minutes', target: 40 + level * 5 },
    { metric: 'groupLevel', target: Math.min(MAX_GROUP_LEVEL, groupLevel(ctx.groupXp[weak]) + 1), group: weak },
    { metric: 'typeSessions', target: level >= 10 ? 3 : 2, type: pick(['fuerza', 'hiit', 'tabata'] as TrainingType[]) },
    { metric: 'noSkip', target: 1 },
    { metric: 'measure', target: 1 },
    { metric: 'sessions', target: Math.min(5, 2 + Math.floor(level / 8)) },
  ];
  const req = reqs[Math.floor(level / 3) % reqs.length];
  const text: Record<Requirement['metric'], [string, string]> = {
    sessions: [`Completa ${req.target} entrenamientos`, 'Cualquier tipo de rutina cuenta.'],
    days: [`Entrena ${req.target} días distintos`, 'La constancia vale más que una sesión enorme.'],
    minutes: [`Acumula ${req.target} minutos de entrenamiento`, 'Suma el tiempo de todas tus sesiones desde que empezó el reto.'],
    typeSessions: [`Completa ${req.target} sesiones de ${req.metric === 'typeSessions' ? typeInfo(req.type).name : ''}`, 'Sal de tu zona de confort con otro estilo.'],
    groupLevel: [`Sube ${req.metric === 'groupLevel' ? groupName(req.group) : ''} a nivel ${req.target}`, 'Entrena ese grupo para ganar su XP.'],
    noSkip: ['Termina un entrenamiento sin saltar ejercicios', 'Todos los intervalos y series, de principio a fin.'],
    measure: ['Registra tus medidas corporales', 'Ver tu evolución también es parte del entrenamiento.'],
  };
  return { ...base, kind: 'requirement', title: text[req.metric][0], desc: text[req.metric][1], requirement: req };
}

// ---------- Evaluación ----------

export type ProgressCtx = {
  /** Entrenamientos con fecha/hora ISO (`at`) */
  workouts: { at?: string; date: string; type: TrainingType; minutes: number }[];
  /** Fechas (YYYY-MM-DD) de medidas registradas */
  measureDates: string[];
  groupXp: Record<GroupId, number>;
};

/** Progreso de un reto: valor actual / objetivo (para la barra). */
export function challengeStatus(ch: Challenge, ctx: ProgressCtx): { value: number; target: number; done: boolean } {
  if (ch.done) return { value: 1, target: 1, done: true };
  const r = ch.requirement;
  if (!r) return { value: 0, target: 1, done: false };
  const since = ctx.workouts.filter((w) => (w.at ?? w.date + 'T23:59:59') >= ch.startedAt);
  let value = 0;
  switch (r.metric) {
    case 'sessions':
      value = since.length;
      break;
    case 'days':
      value = new Set(since.map((w) => w.date)).size;
      break;
    case 'minutes':
      value = since.reduce((s, w) => s + w.minutes, 0);
      break;
    case 'typeSessions':
      value = since.filter((w) => w.type === r.type).length;
      break;
    case 'groupLevel':
      value = groupLevel(ctx.groupXp[r.group]);
      break;
    case 'measure':
      value = ctx.measureDates.filter((d) => d >= ch.startedAt.slice(0, 10)).length;
      break;
    case 'noSkip':
      value = 0; // se marca al terminar un entrenamiento completo
      break;
  }
  return { value: Math.min(value, r.target), target: r.target, done: value >= r.target };
}

// ---------- XP de un entrenamiento ----------

const INTENSITY_MULT = { 1: 1, 2: 1.1, 3: 1.25, 4: 1.4 } as const;

/** XP de un intervalo o serie completado. */
export const stepXp = (item: RoutineItem, intensity: 1 | 2 | 3 | 4) =>
  // Serie de fuerza ≈ 1,6 XP por repetición (equivale a ~1 min de esfuerzo); intervalo = 1 XP cada 4 s de trabajo
  Math.max(1, Math.round((item.reps !== undefined ? item.reps * 1.6 : item.work / 4) * INTENSITY_MULT[intensity]));

export type WorkoutInput = {
  items: RoutineItem[];
  /** Intervalos/series completados por ejercicio (mismo índice que items) */
  done: number[];
  intensity: 1 | 2 | 3 | 4;
  minutes: number;
  type: TrainingType;
  fromPlan: boolean;
  challengeId?: string;
  /** ¿Entrenó también ayer? */
  streak: boolean;
};

export type Reward = {
  xp: number;
  breakdown: { label: string; xp: number; icon: string }[];
  groups: { group: GroupId; xp: number; before: number; after: number }[];
  levelBefore: number;
  levelAfter: number;
  challengeCompleted: Challenge | null;
  newChallenge: Challenge | null;
  novaUnlock: (typeof NOVA_STAGES)[number] | null;
  skipped: number;
};

/**
 * Aplica un entrenamiento terminado al progreso.
 * `ctxAfter` debe incluir ya el entrenamiento recién registrado (para los retos de conteo).
 */
export function applyWorkout(p: Progress, w: WorkoutInput, ctxAfter: Omit<ProgressCtx, 'groupXp'>, gen: Omit<GenCtx, 'groupXp'>): { progress: Progress; reward: Reward } {
  const breakdown: Reward['breakdown'] = [];
  const gained = emptyGroupXp();

  let exerciseXp = 0;
  w.items.forEach((it, i) => {
    const per = stepXp(it, w.intensity);
    const x = per * (w.done[i] ?? 0);
    exerciseXp += x;
    const groups = [...new Set(it.exercise.muscles.map((m) => MUSCLES[m].group))];
    groups.forEach((g) => (gained[g] += x / groups.length));
  });
  breakdown.push({ label: 'Ejercicios completados', xp: exerciseXp, icon: 'dumbbell' });

  const totalSteps = w.items.reduce((s, it) => s + it.rounds, 0);
  const doneSteps = w.done.reduce((s, d) => s + d, 0);
  const skipped = totalSteps - doneSteps;
  if (totalSteps && doneSteps / totalSteps >= 0.8) breakdown.push({ label: 'Entrenamiento terminado', xp: 25, icon: 'flag-checkered' });
  if (w.fromPlan) breakdown.push({ label: 'Siguiendo tu plan', xp: 15, icon: 'calendar-check' });
  if (w.streak) breakdown.push({ label: 'Racha: entrenaste ayer', xp: 10, icon: 'fire' });
  const isChallengeRoutine = !!w.challengeId && w.challengeId === p.challenge.id && p.challenge.kind === 'routine';
  if (isChallengeRoutine && skipped === 0) breakdown.push({ label: 'Rutina de reto', xp: 50, icon: 'sword-cross' });

  const xp = breakdown.reduce((s, b) => s + b.xp, 0);
  const groupXp = { ...p.groupXp };
  const groupsOut: Reward['groups'] = [];
  (Object.keys(gained) as GroupId[]).forEach((g) => {
    const add = Math.round(gained[g]);
    if (!add) return;
    const before = groupLevel(groupXp[g]);
    groupXp[g] += add;
    groupsOut.push({ group: g, xp: add, before, after: groupLevel(groupXp[g]) });
  });
  groupsOut.sort((a, b) => b.xp - a.xp);

  // ¿Se cumple el reto con este entrenamiento?
  let ch = { ...p.challenge };
  if (!ch.done) {
    const completedNames = w.items.filter((_, i) => (w.done[i] ?? 0) > 0).map((it) => it.exercise.name);
    if (ch.kind === 'routine') ch.done = isChallengeRoutine && skipped === 0;
    else if (ch.kind === 'exercises') ch.done = !!ch.exercises?.every((n) => completedNames.includes(n));
    else if (ch.requirement?.metric === 'noSkip') ch.done = skipped === 0 && totalSteps > 0;
    else ch.done = challengeStatus(ch, { ...ctxAfter, groupXp }).done;
  }
  const challengeCompleted = ch.done && !p.challenge.done ? ch : null;

  const next = advance({ ...p, xp: p.xp + xp, groupXp, challenge: ch }, gen);
  return {
    progress: next.progress,
    reward: {
      xp,
      breakdown,
      groups: groupsOut,
      levelBefore: p.level,
      levelAfter: next.progress.level,
      challengeCompleted,
      newChallenge: next.progress.level > p.level ? next.progress.challenge : null,
      novaUnlock: novaStage(next.progress.level) > novaStage(p.level) ? NOVA_STAGES[novaStage(next.progress.level)] : null,
      skipped,
    },
  };
}

/** Sube de nivel mientras haya XP suficiente y el reto esté superado. */
export function advance(p: Progress, gen: Omit<GenCtx, 'groupXp'>): { progress: Progress; levelUps: number } {
  let cur = p;
  let ups = 0;
  while (cur.level < MAX_LEVEL && cur.challenge.done && cur.xp >= xpForLevel(cur.level + 1)) {
    const level = cur.level + 1;
    cur = {
      ...cur,
      level,
      completed: [...cur.completed, { id: cur.challenge.id, title: cur.challenge.title, level: cur.challenge.level, at: new Date().toISOString() }],
      challenge: makeChallenge(level, { ...gen, groupXp: cur.groupXp }),
    };
    ups++;
  }
  return { progress: cur, levelUps: ups };
}

/** Re-evalúa retos de requisito ante otros eventos (p. ej. registrar medidas). */
export function refreshChallenge(p: Progress, ctx: ProgressCtx, gen: Omit<GenCtx, 'groupXp'>): Progress {
  if (p.challenge.done || p.challenge.kind !== 'requirement' || p.challenge.requirement?.metric === 'noSkip') return p;
  if (!challengeStatus(p.challenge, ctx).done) return p;
  return advance({ ...p, challenge: { ...p.challenge, done: true } }, gen).progress;
}

/** Rutina lista para cumplir un reto de tipo «rutina» o «ejercicios». */
export function challengeRoutine(ch: Challenge, opts: { equipment: Equipment[]; exclude: string[]; level: 1 | 2 | 3; intensity: 1 | 2 | 3 | 4 }, agentLevel: AgentLevel): Routine | null {
  if (ch.kind === 'routine' && ch.routine) {
    const { type, groups, minutes } = ch.routine;
    const r = generateRoutine(
      {
        type,
        muscles: groups.flatMap(musclesOfGroup),
        minutes,
        intensity: opts.intensity,
        level: opts.level,
        equipment: opts.equipment,
        rounds: type === 'tabata' ? 8 : type === 'fuerza' ? 3 : 3,
        reps: 12,
        exclude: opts.exclude,
      },
      agentLevel,
    );
    return { ...r, title: `Reto Nv ${ch.level + 1}`, challengeId: ch.id };
  }
  if (ch.kind === 'exercises' && ch.exercises) {
    const list = ch.exercises.map((n) => EXERCISES.find((e) => e.name === n)!).filter(Boolean);
    // Tipo que admitan más ejercicios de la lista
    const counts = (['hiit', 'tabata', 'fuerza', 'insanity'] as TrainingType[]).map((t) => ({ t, n: list.filter((e) => e.types.includes(t)).length }));
    const type = counts.sort((a, b) => b.n - a.n)[0].t;
    const info = typeInfo(type);
    const strength = type === 'fuerza';
    const items: RoutineItem[] = list.map((exercise) => ({
      exercise,
      rounds: strength ? 3 : type === 'tabata' ? 4 : 3,
      work: info.work,
      rest: info.rest,
      reps: strength ? 12 : undefined,
    }));
    return {
      id: String(Date.now()),
      title: `Reto Nv ${ch.level + 1} · Ejercicios`,
      type,
      options: { type, muscles: [], minutes: 15, intensity: opts.intensity, level: opts.level, equipment: opts.equipment, rounds: 3, reps: 12, exclude: opts.exclude },
      items,
      totalSeconds: items.reduce((s, it) => s + it.rounds * (it.work + it.rest), 0),
      note: '¡Rutina de reto lista! Complétala para superar el requisito.',
      challengeId: ch.id,
    };
  }
  return null;
}

export function initialProgress(gen: Omit<GenCtx, 'groupXp'>): Progress {
  const groupXp = emptyGroupXp();
  return { xp: 0, level: 1, groupXp, challenge: makeChallenge(1, { ...gen, groupXp }), completed: [] };
}
