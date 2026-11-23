export type GroupId = 'pecho' | 'espalda' | 'hombros' | 'brazos' | 'core' | 'piernas' | 'gluteos';

export type MuscleId =
  | 'pectorales'
  | 'deltoides'
  | 'biceps'
  | 'triceps'
  | 'antebrazos'
  | 'abdominales'
  | 'oblicuos'
  | 'lumbares'
  | 'trapecio'
  | 'dorsales'
  | 'cuadriceps'
  | 'isquios'
  | 'gemelos'
  | 'tibiales'
  | 'gluteo';

export const GROUPS: { id: GroupId; name: string; icon: string }[] = [
  { id: 'pecho', name: 'Pecho', icon: 'shield-outline' },
  { id: 'espalda', name: 'Espalda', icon: 'human-handsdown' },
  { id: 'hombros', name: 'Hombros', icon: 'human-handsup' },
  { id: 'brazos', name: 'Brazos', icon: 'arm-flex' },
  { id: 'core', name: 'Core', icon: 'circle-double' },
  { id: 'piernas', name: 'Piernas', icon: 'run' },
  { id: 'gluteos', name: 'Glúteos', icon: 'seat-legroom-normal' },
];

export const MUSCLES: Record<MuscleId, { name: string; group: GroupId }> = {
  pectorales: { name: 'Pectorales', group: 'pecho' },
  deltoides: { name: 'Deltoides', group: 'hombros' },
  trapecio: { name: 'Trapecio', group: 'espalda' },
  dorsales: { name: 'Dorsales', group: 'espalda' },
  lumbares: { name: 'Lumbares', group: 'espalda' },
  biceps: { name: 'Bíceps', group: 'brazos' },
  triceps: { name: 'Tríceps', group: 'brazos' },
  antebrazos: { name: 'Antebrazos', group: 'brazos' },
  abdominales: { name: 'Abdominales', group: 'core' },
  oblicuos: { name: 'Oblicuos', group: 'core' },
  cuadriceps: { name: 'Cuádriceps', group: 'piernas' },
  isquios: { name: 'Isquiotibiales', group: 'piernas' },
  gemelos: { name: 'Gemelos', group: 'piernas' },
  tibiales: { name: 'Tibiales', group: 'piernas' },
  gluteo: { name: 'Glúteo mayor', group: 'gluteos' },
};

export const ALL_MUSCLES = Object.keys(MUSCLES) as MuscleId[];

export const musclesOfGroup = (g: GroupId) => ALL_MUSCLES.filter((m) => MUSCLES[m].group === g);
