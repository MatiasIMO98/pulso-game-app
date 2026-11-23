import type { MuscleId } from './muscles';

export type TrainingType = 'tabata' | 'hiit' | 'insanity' | 'fuerza';
export type Equipment = 'ninguno' | 'mancuernas' | 'barra' | 'bandas';

export type Exercise = {
  id: string;
  name: string;
  muscles: MuscleId[];
  equipment: Equipment;
  types: TrainingType[];
  icon: string;
  desc: string;
};

const ALL: TrainingType[] = ['tabata', 'hiit', 'insanity', 'fuerza'];
const CARDIO: TrainingType[] = ['tabata', 'hiit', 'insanity'];
const STR: TrainingType[] = ['fuerza'];

type Row = [string, MuscleId[], Equipment, TrainingType[], string, string];

const rows: Row[] = [
  ['Flexiones', ['pectorales', 'triceps', 'deltoides'], 'ninguno', ALL, 'arm-flex', 'Cuerpo recto, baja el pecho hasta casi tocar el suelo.'],
  ['Flexiones diamante', ['triceps', 'pectorales'], 'ninguno', ALL, 'arm-flex', 'Manos juntas formando un diamante bajo el pecho.'],
  ['Flexiones inclinadas', ['pectorales', 'deltoides'], 'ninguno', ALL, 'arm-flex', 'Manos sobre un banco o silla, ideal para empezar.'],
  ['Fondos en silla', ['triceps', 'pectorales'], 'ninguno', ALL, 'seat', 'Codos hacia atrás, baja controlando.'],
  ['Press con mancuernas', ['pectorales', 'triceps'], 'mancuernas', STR, 'dumbbell', 'Tumbado, empuja las mancuernas hacia arriba.'],
  ['Aperturas', ['pectorales'], 'mancuernas', STR, 'dumbbell', 'Brazos semiflexionados, abre y cierra en arco.'],
  ['Press militar', ['deltoides', 'triceps'], 'mancuernas', STR, 'weight-lifter', 'De pie, empuja sobre la cabeza sin arquear la espalda.'],
  ['Elevaciones laterales', ['deltoides'], 'mancuernas', ['fuerza', 'hiit'], 'dumbbell', 'Sube los brazos hasta la altura del hombro.'],
  ['Pike push-ups', ['deltoides', 'triceps'], 'ninguno', ALL, 'human-handsup', 'Cadera arriba en V, baja la cabeza hacia el suelo.'],
  ['Remo con mancuerna', ['dorsales', 'biceps'], 'mancuernas', STR, 'dumbbell', 'Apoya una mano, tira del codo hacia la cadera.'],
  ['Dominadas', ['dorsales', 'biceps'], 'barra', STR, 'weight-lifter', 'Agarre prono, sube hasta pasar la barbilla.'],
  ['Remo con banda', ['dorsales', 'trapecio'], 'bandas', ['fuerza', 'hiit'], 'vector-curve', 'Junta escápulas al final del movimiento.'],
  ['Encogimientos', ['trapecio'], 'mancuernas', STR, 'dumbbell', 'Sube los hombros hacia las orejas y baja lento.'],
  ['Superman', ['lumbares', 'gluteo'], 'ninguno', ALL, 'human-handsup', 'Boca abajo, eleva brazos y piernas a la vez.'],
  ['Bird dog', ['lumbares', 'abdominales', 'gluteo'], 'ninguno', ['fuerza', 'hiit'], 'yoga', 'En cuadrupedia, extiende brazo y pierna opuestos.'],
  ['Curl de bíceps', ['biceps', 'antebrazos'], 'mancuernas', STR, 'dumbbell', 'Codos pegados al cuerpo, sube sin balancear.'],
  ['Curl martillo', ['biceps', 'antebrazos'], 'mancuernas', STR, 'hammer', 'Agarre neutro, como sosteniendo un martillo.'],
  ['Curl con banda', ['biceps'], 'bandas', ['fuerza', 'hiit'], 'vector-curve', 'Pisa la banda y flexiona los codos.'],
  ['Extensión de tríceps', ['triceps'], 'mancuernas', STR, 'dumbbell', 'Mancuerna tras la cabeza, extiende los codos.'],
  ['Curl de muñeca', ['antebrazos'], 'mancuernas', STR, 'hand-back-right', 'Antebrazo apoyado, flexiona solo la muñeca.'],
  ['Plancha', ['abdominales', 'oblicuos', 'lumbares'], 'ninguno', ALL, 'minus', 'Codos bajo los hombros, abdomen firme.'],
  ['Crunch', ['abdominales'], 'ninguno', ALL, 'human', 'Despega los omóplatos, sin tirar del cuello.'],
  ['Bicicleta abdominal', ['abdominales', 'oblicuos'], 'ninguno', ALL, 'bike', 'Codo hacia rodilla contraria, alterna.'],
  ['Escaladores', ['abdominales', 'deltoides', 'cuadriceps'], 'ninguno', CARDIO, 'run-fast', 'En plancha alta, lleva rodillas al pecho rápido.'],
  ['Russian twist', ['oblicuos'], 'ninguno', ALL, 'rotate-3d-variant', 'Sentado con pies elevados, gira el tronco.'],
  ['Plancha lateral', ['oblicuos'], 'ninguno', ALL, 'minus', 'Cadera alta, cuerpo en línea recta.'],
  ['Elevación de piernas', ['abdominales'], 'ninguno', ALL, 'human', 'Tumbado, sube piernas rectas sin arquear la espalda.'],
  ['Sentadillas', ['cuadriceps', 'gluteo'], 'ninguno', ALL, 'human', 'Cadera atrás, rodillas en línea con los pies.'],
  ['Sentadilla con salto', ['cuadriceps', 'gluteo', 'gemelos'], 'ninguno', CARDIO, 'arrow-up-bold', 'Explota hacia arriba y aterriza suave.'],
  ['Zancadas', ['cuadriceps', 'gluteo', 'isquios'], 'ninguno', ALL, 'walk', 'Paso largo, rodilla trasera casi al suelo.'],
  ['Sentadilla goblet', ['cuadriceps', 'gluteo'], 'mancuernas', STR, 'kettlebell', 'Mancuerna al pecho, baja profundo.'],
  ['Peso muerto rumano', ['isquios', 'gluteo', 'lumbares'], 'mancuernas', STR, 'weight-lifter', 'Rodillas suaves, lleva la cadera atrás.'],
  ['Puente de glúteo', ['gluteo', 'isquios'], 'ninguno', ALL, 'bridge', 'Empuja con los talones, aprieta arriba.'],
  ['Patada de glúteo', ['gluteo'], 'ninguno', ALL, 'shoe-sneaker', 'En cuadrupedia, empuja el talón hacia el techo.'],
  ['Sentadilla sumo', ['gluteo', 'cuadriceps'], 'ninguno', ALL, 'human', 'Pies abiertos y puntas hacia fuera.'],
  ['Sentadilla isométrica', ['cuadriceps'], 'ninguno', ALL, 'wall', 'Espalda en la pared, muslos paralelos al suelo.'],
  ['Elevación de talones', ['gemelos'], 'ninguno', ALL, 'shoe-heel', 'Sube de puntillas y baja lento.'],
  ['Comba simulada', ['gemelos', 'tibiales'], 'ninguno', CARDIO, 'jump-rope', 'Saltitos rápidos girando las muñecas.'],
  ['Caminata de talones', ['tibiales'], 'ninguno', ['fuerza', 'hiit'], 'walk', 'Camina apoyando solo los talones.'],
  ['Burpees', ['pectorales', 'cuadriceps', 'abdominales', 'deltoides'], 'ninguno', CARDIO, 'run-fast', 'Abajo, flexión, salto. Sin pausa.'],
  ['Jumping jacks', ['deltoides', 'gemelos'], 'ninguno', CARDIO, 'human-handsup', 'Abre brazos y piernas a la vez.'],
  ['Saltos de esquiador', ['cuadriceps', 'gluteo', 'gemelos'], 'ninguno', CARDIO, 'ski', 'Saltos laterales amplios, aterriza en una pierna.'],
  ['Rodillas altas', ['cuadriceps', 'abdominales', 'gemelos'], 'ninguno', CARDIO, 'run', 'Corre en el sitio subiendo las rodillas.'],
  ['Sprint en el sitio', ['cuadriceps', 'isquios'], 'ninguno', CARDIO, 'run-fast', 'Máxima velocidad, brazos activos.'],
  ['Plank jacks', ['abdominales', 'deltoides'], 'ninguno', CARDIO, 'minus', 'En plancha, abre y cierra las piernas saltando.'],
];

export const EXERCISES: Exercise[] = rows.map(([name, muscles, equipment, types, icon, desc], i) => ({
  id: `ex${i}`,
  name,
  muscles,
  equipment,
  types,
  icon,
  desc,
}));

export const TRAINING_TYPES: {
  id: TrainingType;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  work: number;
  rest: number;
}[] = [
  { id: 'tabata', name: 'Tabata', tagline: '20s trabajo · 10s descanso', icon: 'timer-outline', color: '#FF5A36', work: 20, rest: 10 },
  { id: 'hiit', name: 'HIIT', tagline: 'Intervalos de alta intensidad', icon: 'lightning-bolt', color: '#FFB020', work: 40, rest: 20 },
  { id: 'insanity', name: 'Insanity', tagline: 'Bloques largos, descanso mínimo', icon: 'fire', color: '#E14CFF', work: 60, rest: 15 },
  { id: 'fuerza', name: 'Fuerza', tagline: 'Series y repeticiones', icon: 'dumbbell', color: '#3D8BFF', work: 45, rest: 90 },
];

export const typeInfo = (t: TrainingType) => TRAINING_TYPES.find((x) => x.id === t)!;

export const EQUIPMENT: { id: Equipment; name: string }[] = [
  { id: 'ninguno', name: 'Sin equipo' },
  { id: 'mancuernas', name: 'Mancuernas' },
  { id: 'barra', name: 'Barra' },
  { id: 'bandas', name: 'Bandas' },
];
