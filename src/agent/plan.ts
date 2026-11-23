/**
 * Plan inicial a partir del cuestionario de bienvenida.
 * Lógica local (simulada); como agent.ts, está aislada para poder delegarla a Claude más adelante.
 */
import type { Equipment, TrainingType } from '../data/exercises';
import { GROUPS, musclesOfGroup, type GroupId, type MuscleId } from '../data/muscles';
import type { AgentLevel, RoutineOptions } from './agent';

export type Goal = 'grasa' | 'musculo' | 'resistencia' | 'tonificar' | 'salud';
export type Limitation = 'rodillas' | 'espalda' | 'hombros' | 'munecas';
export type DayTime = 'manana' | 'mediodia' | 'tarde' | 'noche';

export const GOALS: { id: Goal; name: string; desc: string; icon: string }[] = [
  { id: 'grasa', name: 'Perder grasa', desc: 'Quemar calorías y definir', icon: 'fire' },
  { id: 'musculo', name: 'Ganar músculo', desc: 'Más fuerza y volumen', icon: 'arm-flex' },
  { id: 'resistencia', name: 'Mejorar resistencia', desc: 'Aguantar más y cansarte menos', icon: 'run-fast' },
  { id: 'tonificar', name: 'Tonificar', desc: 'Firmeza sin buscar volumen', icon: 'yoga' },
  { id: 'salud', name: 'Salud general', desc: 'Moverme y sentirme mejor', icon: 'heart-pulse' },
];

export const LEVELS: { id: 1 | 2 | 3; name: string; desc: string; icon: string }[] = [
  { id: 1, name: 'Principiante', desc: 'No entreno o acabo de empezar', icon: 'sprout' },
  { id: 2, name: 'Intermedio', desc: 'Entreno 1–3 veces por semana', icon: 'leaf' },
  { id: 3, name: 'Avanzado', desc: 'Entreno con regularidad desde hace tiempo', icon: 'tree' },
];

export const DAY_TIMES: { id: DayTime; name: string; time: string; icon: string }[] = [
  { id: 'manana', name: 'Mañana', time: '07:00', icon: 'weather-sunset-up' },
  { id: 'mediodia', name: 'Mediodía', time: '13:00', icon: 'white-balance-sunny' },
  { id: 'tarde', name: 'Tarde', time: '18:00', icon: 'weather-sunset-down' },
  { id: 'noche', name: 'Noche', time: '20:30', icon: 'weather-night' },
];

export const LIMITATIONS: { id: Limitation; name: string; avoid: string[] }[] = [
  { id: 'rodillas', name: 'Rodillas', avoid: ['Sentadilla con salto', 'Saltos de esquiador', 'Burpees', 'Zancadas', 'Sprint en el sitio', 'Comba simulada'] },
  { id: 'espalda', name: 'Espalda baja', avoid: ['Peso muerto rumano', 'Superman', 'Elevación de piernas', 'Russian twist'] },
  { id: 'hombros', name: 'Hombros', avoid: ['Press militar', 'Pike push-ups', 'Elevaciones laterales', 'Fondos en silla'] },
  { id: 'munecas', name: 'Muñecas', avoid: ['Flexiones diamante', 'Plank jacks', 'Curl de muñeca', 'Fondos en silla'] },
];

export type PlanAnswers = {
  goal: Goal;
  level: 1 | 2 | 3;
  weekdays: number[]; // getDay(): 0 = domingo
  dayTime: DayTime;
  minutes: number;
  priorities: GroupId[];
  equipment: Equipment[];
  limitations: Limitation[];
};

export type PlanDay = {
  weekday: number;
  type: TrainingType;
  groups: GroupId[];
  label: string;
};

export type TrainingPlan = PlanAnswers & {
  createdAt: string;
  schedule: PlanDay[];
  /** Meta semanal: número de sesiones */
  weeklyGoal: number;
  /** Ejercicios a evitar por las limitaciones indicadas */
  exclude: string[];
  intensity: 1 | 2 | 3 | 4;
  headline: string;
};

const TYPE_SEQUENCE: Record<Goal, TrainingType[]> = {
  grasa: ['hiit', 'fuerza', 'tabata', 'fuerza', 'insanity', 'hiit', 'tabata'],
  musculo: ['fuerza', 'fuerza', 'fuerza', 'hiit', 'fuerza', 'fuerza', 'tabata'],
  resistencia: ['insanity', 'hiit', 'tabata', 'insanity', 'hiit', 'fuerza', 'tabata'],
  tonificar: ['tabata', 'fuerza', 'hiit', 'fuerza', 'tabata', 'fuerza', 'hiit'],
  salud: ['fuerza', 'hiit', 'fuerza', 'tabata', 'fuerza', 'hiit', 'tabata'],
};

const ALL_GROUPS = GROUPS.map((g) => g.id);
const STRENGTH_SPLITS: { label: string; groups: GroupId[] }[] = [
  { label: 'Tren superior · empuje', groups: ['pecho', 'hombros', 'brazos'] },
  { label: 'Espalda y bíceps', groups: ['espalda', 'brazos'] },
  { label: 'Piernas y glúteos', groups: ['piernas', 'gluteos', 'core'] },
];
const CARDIO_FOCUS: { label: string; groups: GroupId[] }[] = [
  { label: 'Cuerpo completo', groups: ALL_GROUPS },
  { label: 'Core y piernas', groups: ['core', 'piernas', 'gluteos'] },
];

const groupName = (g: GroupId) => GROUPS.find((x) => x.id === g)!.name;
const TYPE_NAME: Record<TrainingType, string> = { tabata: 'Tabata', hiit: 'HIIT', insanity: 'Insanity', fuerza: 'Fuerza' };

export function buildPlan(a: PlanAnswers, agentLevel: AgentLevel): TrainingPlan {
  // Orden lunes→domingo
  const days = [...a.weekdays].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7));
  let seq = TYPE_SEQUENCE[a.goal].slice(0, days.length);
  if (a.level === 1) seq = seq.map((t) => (t === 'insanity' ? 'hiit' : t));

  let strengthCount = 0;
  let cardioCount = 0;
  const strengthDays = seq.filter((t) => t === 'fuerza').length;

  const schedule: PlanDay[] = days.map((weekday, i) => {
    const type = seq[i];
    let focus: { label: string; groups: GroupId[] };
    if (type === 'fuerza') {
      // Con 1–2 días de fuerza: cuerpo completo; con más, rutina dividida
      focus = strengthDays <= 2 ? { label: 'Cuerpo completo', groups: ALL_GROUPS } : STRENGTH_SPLITS[strengthCount % 3];
      strengthCount++;
    } else {
      focus = CARDIO_FOCUS[cardioCount % 2];
      cardioCount++;
    }
    // Zonas prioritarias: en días alternos, los de cuerpo completo pasan a "énfasis" y los divididos las suman
    let groups = focus.groups;
    let label = focus.label;
    if (a.priorities.length && i % 2 === 0) {
      if (groups.length === ALL_GROUPS.length) {
        groups = [...new Set<GroupId>([...a.priorities, 'core'])];
        label = `Énfasis en ${a.priorities.map(groupName).join(' y ')}`;
      } else {
        const extra = a.priorities.filter((p) => !groups.includes(p));
        if (extra.length) {
          groups = [...groups, ...extra];
          label += ` + ${extra.map(groupName).join(', ')}`;
        }
      }
    }
    return { weekday, type, groups, label: `${TYPE_NAME[type]} · ${label}` };
  });

  const base = a.level === 1 ? 2 : a.level === 2 ? 2 : 3;
  const boost = a.goal === 'grasa' || a.goal === 'resistencia' ? 1 : 0;
  const intensity = Math.min(4, base + boost) as 1 | 2 | 3 | 4;
  const exclude = [...new Set(a.limitations.flatMap((l) => LIMITATIONS.find((x) => x.id === l)!.avoid))];
  const goal = GOALS.find((g) => g.id === a.goal)!;

  const tone = agentLevel <= 2 ? 0 : agentLevel === 3 ? 1 : 2;
  const headline = [
    `Un plan tranquilo para ${goal.name.toLowerCase()}: ${days.length} sesiones de ${a.minutes} min a la semana.`,
    `¡Tu plan para ${goal.name.toLowerCase()} está listo! ${days.length} sesiones de ${a.minutes} min por semana.`,
    `¡${days.length} sesiones de ${a.minutes} min cada semana para ${goal.name.toLowerCase()}! ¡A cumplirlo!`,
  ][tone];

  return { ...a, weekdays: days, createdAt: new Date().toISOString(), schedule, weeklyGoal: days.length, exclude, intensity, headline };
}

/** Opciones de rutina para un día del plan. */
export function planDayOptions(plan: TrainingPlan, day: PlanDay): RoutineOptions {
  const muscles: MuscleId[] = day.groups.length === ALL_GROUPS.length ? [] : day.groups.flatMap(musclesOfGroup);
  const strength = day.type === 'fuerza';
  return {
    type: day.type,
    muscles,
    minutes: plan.minutes,
    intensity: plan.intensity,
    level: plan.level,
    equipment: plan.equipment,
    rounds: day.type === 'tabata' ? 8 : strength ? (plan.level === 1 ? 3 : 4) : 3,
    reps: plan.goal === 'musculo' ? 10 : plan.goal === 'tonificar' || plan.goal === 'resistencia' ? 15 : 12,
    exclude: plan.exclude,
  };
}

export const planTime = (plan: TrainingPlan) => DAY_TIMES.find((d) => d.id === plan.dayTime)!.time;
