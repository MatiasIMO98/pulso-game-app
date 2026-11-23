/**
 * Agente "Nova" simulado.
 * Toda la lógica es local (reglas + frases). Está aislada aquí para poder
 * sustituirla más adelante por llamadas reales a Claude sin tocar las pantallas.
 */
import { EXERCISES, typeInfo, type Equipment, type Exercise, type TrainingType } from '../data/exercises';
import { GROUPS, MUSCLES, type GroupId, type MuscleId } from '../data/muscles';

export type AgentLevel = 1 | 2 | 3 | 4 | 5;
export type Mood = 'calm' | 'happy' | 'hype' | 'focus' | 'alert';
export type Priority = 'high' | 'normal' | 'low';

export const AGENT_LEVELS: { level: AgentLevel; name: string; desc: string }[] = [
  { level: 1, name: 'Zen', desc: 'Solo lo esencial, tono sereno' },
  { level: 2, name: 'Amable', desc: 'Apoyo suave y pocos mensajes' },
  { level: 3, name: 'Equilibrado', desc: 'Guía clara con algo de ánimo' },
  { level: 4, name: 'Enérgico', desc: 'Motivación frecuente y directa' },
  { level: 5, name: 'Sargento', desc: 'Exigente, intenso y sin excusas' },
];

/** ¿Debe mostrarse un mensaje con esta prioridad según el nivel? */
export const shouldSpeak = (level: AgentLevel, p: Priority) =>
  p === 'high' || (p === 'normal' && level >= 2) || (p === 'low' && level >= 4);

export const bubbleDuration = (level: AgentLevel) => [2600, 3200, 3800, 4200, 4500][level - 1];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const tier = (l: AgentLevel) => (l <= 2 ? 0 : l === 3 ? 1 : 2); // suave / medio / intenso

const P = {
  greet: [
    ['Hola. Cuando quieras, empezamos.', 'Respira. Hoy es un buen día para moverse.'],
    ['¡Hola! ¿Listo para entrenar hoy?', 'Elige tus zonas y armo la rutina.'],
    ['¡Vamos! Hoy toca sudar.', '¿Qué machacamos hoy? Tú eliges, yo te empujo.'],
  ],
  workStart: [
    ['Adelante, a tu ritmo.', 'Comenzamos con calma.'],
    ['¡Vamos con {ex}!', '¡Arriba! {ex}, buena técnica.'],
    ['¡{ex}! ¡Dalo todo!', '¡A FONDO con {ex}! ¡Sin frenar!'],
  ],
  mid: [
    ['Bien, sigue así.', 'Respira profundo.'],
    ['¡Mitad hecha, sigue!', '¡Buen ritmo!'],
    ['¡No bajes la intensidad!', '¡Más fuerte! ¡Tú puedes con esto!', '¡Esa es la actitud, sigue empujando!'],
  ],
  rest: [
    ['Descansa. Después: {next}.', 'Pausa. Luego viene {next}.'],
    ['¡Descanso! Lo siguiente: {next}.', 'Recupera aire. Prepárate para {next}.'],
    ['¡Respira rápido, que viene {next}!', '¡Pausa corta! {next} te espera.'],
  ],
  last3: [['3, 2, 1…'], ['¡3, 2, 1!'], ['¡3! ¡2! ¡1! ¡YA!']],
  done: [
    ['Entrenamiento completado. Bien hecho.', 'Terminaste. Date un momento para ti.'],
    ['¡Completado! Excelente trabajo hoy.', '¡Lo lograste! Cada sesión suma.'],
    ['¡BRUTAL! ¡Sesión destrozada!', '¡Eso es entrenar! ¡Mañana más!'],
  ],
  routine: [
    ['Tu rutina está lista. Sin prisas.', 'Preparé algo equilibrado para ti.'],
    ['¡Rutina lista! Revisa y cuando quieras, empezamos.', '¡Aquí tienes! Puedes cambiar cualquier ejercicio.'],
    ['¡Rutina cargada! ¡Sin excusas, a darle!', '¡Esto va a doler… del bueno!'],
  ],
  reminder: [
    ['Hoy tienes {type} a las {time}. Sin presión.', 'Un recordatorio amable: {type} a las {time}.'],
    ['¡Hoy toca {type} a las {time}! Te espero.', '¿Listo para {type} a las {time}?'],
    ['{type} a las {time}. ¡No me falles!', '¡A las {time} {type}! ¡Ni se te ocurra saltarlo!'],
  ],
};

const fill = (s: string, v: Record<string, string> = {}) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
export const phrase = (key: keyof typeof P, level: AgentLevel, v?: Record<string, string>) =>
  fill(pick(P[key][tier(level)]), v);

// ---------- Generación de rutinas ----------

export type RoutineOptions = {
  type: TrainingType;
  muscles: MuscleId[];
  minutes: number;
  intensity: 1 | 2 | 3 | 4;
  level: 1 | 2 | 3;
  equipment: Equipment[];
  rounds: number; // tabata/hiit/insanity: rondas por ejercicio · fuerza: series
  reps: number; // solo fuerza
  /** Nombres de ejercicios a evitar (por lesiones o molestias) */
  exclude?: string[];
};

export type RoutineItem = {
  exercise: Exercise;
  rounds: number;
  work: number; // segundos (en fuerza: estimación por serie)
  rest: number;
  reps?: number;
};

export type Routine = {
  id: string;
  title: string;
  type: TrainingType;
  options: RoutineOptions;
  items: RoutineItem[];
  totalSeconds: number;
  note: string;
  /** Generada desde el plan semanal (da XP extra) */
  fromPlan?: boolean;
  /** Rutina de un reto de nivel */
  challengeId?: string;
};

const INTENSITY_FACTOR = { 1: 0.8, 2: 1, 3: 1.15, 4: 1.3 } as const;

export function generateRoutine(o: RoutineOptions, agentLevel: AgentLevel): Routine {
  const info = typeInfo(o.type);
  const f = INTENSITY_FACTOR[o.intensity];
  const work = o.type === 'tabata' ? 20 : Math.round((info.work * f) / 5) * 5;
  const rest = o.type === 'tabata' ? 10 : Math.max(10, Math.round(info.rest / f / 5) * 5);

  const targets = o.muscles.length ? o.muscles : (Object.keys(MUSCLES) as MuscleId[]);
  const pool = EXERCISES.filter(
    (e) =>
      e.types.includes(o.type) &&
      (e.equipment === 'ninguno' || o.equipment.includes(e.equipment)) &&
      !o.exclude?.includes(e.name) &&
      e.muscles.some((m) => targets.includes(m)),
  );
  // Prioriza ejercicios que cubren músculos aún no cubiertos
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const perExercise = o.rounds * (work + rest);
  const count = Math.max(2, Math.min(12, Math.round((o.minutes * 60) / perExercise)));
  const chosen: Exercise[] = [];
  const covered = new Set<MuscleId>();
  while (chosen.length < count && shuffled.length) {
    shuffled.sort(
      (a, b) =>
        b.muscles.filter((m) => targets.includes(m) && !covered.has(m)).length -
        a.muscles.filter((m) => targets.includes(m) && !covered.has(m)).length,
    );
    const ex = shuffled.shift()!;
    chosen.push(ex);
    ex.muscles.forEach((m) => covered.add(m));
    if (targets.every((m) => covered.has(m))) covered.clear();
  }

  const items: RoutineItem[] = chosen.map((exercise) => ({
    exercise,
    rounds: o.rounds,
    work,
    rest,
    reps: o.type === 'fuerza' ? o.reps : undefined,
  }));
  const totalSeconds = items.reduce((s, it) => s + it.rounds * (it.work + it.rest), 0);
  const groups = [...new Set(targets.map((m) => MUSCLES[m].group))].map((g) => GROUPS.find((x) => x.id === g)!.name);
  const title = `${info.name} · ${o.muscles.length ? groups.slice(0, 2).join(' y ') + (groups.length > 2 ? ' +' : '') : 'Cuerpo completo'}`;

  return {
    id: String(Date.now()),
    title,
    type: o.type,
    options: o,
    items,
    totalSeconds,
    note: phrase('routine', agentLevel),
  };
}

export function swapExercise(r: Routine, index: number): Routine {
  const cur = r.items[index].exercise;
  const used = new Set(r.items.map((i) => i.exercise.id));
  const candidates = EXERCISES.filter(
    (e) =>
      !used.has(e.id) &&
      !r.options.exclude?.includes(e.name) &&
      e.types.includes(r.type) &&
      (e.equipment === 'ninguno' || r.options.equipment.includes(e.equipment)) &&
      e.muscles.some((m) => cur.muscles.includes(m)),
  );
  if (!candidates.length) return r;
  const items = [...r.items];
  items[index] = { ...items[index], exercise: pick(candidates) };
  return { ...r, items };
}

// ---------- Análisis de balance muscular ----------

export function analyzeBalance(load: Record<GroupId, number>, level: AgentLevel) {
  const entries = GROUPS.map((g) => ({ ...g, v: load[g.id] ?? 0 }));
  const sorted = [...entries].sort((a, b) => b.v - a.v);
  const most = sorted[0];
  const least = sorted[sorted.length - 1];
  const avg = entries.reduce((s, e) => s + e.v, 0) / entries.length || 1;
  const t = tier(level);
  if (most.v === 0) {
    const first = [
      'Aún no hay entrenamientos en este periodo. Cuando quieras, empezamos.',
      'Todavía no hay entrenamientos registrados. ¡Completa uno y empiezo a analizar tu balance!',
      '¡Cero sesiones! ¡Hoy empezamos a llenar este mapa!',
    ][t];
    return { most, least, message: first, balanced: true };
  }
  const msgs = [
    `Has trabajado bastante ${most.name.toLowerCase()}. Quizá ${least.name.toLowerCase()} agradecería algo de atención.`,
    `${most.name} va muy fuerte (${Math.round((most.v / avg) * 100)}% de la media). ${least.name} se está quedando atrás: ¿lo incluimos hoy?`,
    `¡${most.name} ya está servido! ¡${least.name} lleva días olvidado, hoy le toca sí o sí!`,
  ];
  return { most, least, message: msgs[t], balanced: most.v - least.v < avg * 0.5 };
}

// ---------- Comentarios de medidas ----------

export function measurementComment(label: string, delta: number, unit: string, goodWhenDown: boolean, level: AgentLevel) {
  const d = Math.abs(delta).toFixed(1);
  const good = goodWhenDown ? delta < 0 : delta > 0;
  const t = tier(level);
  if (delta === 0) return ['Estable. La constancia también es progreso.', '¡Te mantienes! La constancia es clave.', '¡Firme como una roca! ¡Ahora a romper la meseta!'][t];
  if (good)
    return [
      `${label}: ${d} ${unit} de progreso. Muy bien.`,
      `¡${label} mejoró ${d} ${unit}! Tu esfuerzo se nota.`,
      `¡${d} ${unit} en ${label.toLowerCase()}! ¡Esto es lo que pasa cuando no te rindes!`,
    ][t];
  return [
    `${label} cambió ${d} ${unit}. Los cuerpos fluctúan, todo bien.`,
    `${label} varió ${d} ${unit}. Es normal; lo importante es la tendencia.`,
    `${d} ${unit} en ${label.toLowerCase()}. ¡Nada de bajar los brazos, a por la siguiente!`,
  ][t];
}

export function notificationSamples(level: AgentLevel, name: string) {
  const t = tier(level);
  return [
    { title: `${name} · Recordatorio`, body: ['Mañana tienes HIIT a las 07:00.', '¡Mañana HIIT a las 07:00! Deja lista la ropa.', '¡HIIT 07:00! ¡Pon la alarma y no la apagues!'][t] },
    { title: `${name} · Motivación`, body: ['Llevas 3 sesiones esta semana. Bonito ritmo.', '¡3 sesiones esta semana! Vas genial.', '¡3 de 4 sesiones! ¡Remata la semana!'][t] },
    { title: `${name} · Balance`, body: ['Tus piernas podrían recibir algo de cariño.', 'Tus piernas llevan 9 días sin entrenar. ¿Hoy?', '¡9 días sin piernas! ¡Hoy se acaba eso!'][t] },
  ];
}
