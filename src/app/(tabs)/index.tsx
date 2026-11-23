import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { analyzeBalance, generateRoutine, phrase, type RoutineOptions } from '../../agent/agent';
import { planDayOptions, planTime } from '../../agent/plan';
import { titleFor, xpForLevel } from '../../agent/progress';
import { AgentFace } from '../../components/AgentDock';
import { BodyMap } from '../../components/BodyMap';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Chip, Icon, IconBadge, Label, Screen, SectionTitle, Segmented, shade, Stepper } from '../../components/ui';
import { EQUIPMENT, TRAINING_TYPES, type Equipment, type TrainingType } from '../../data/exercises';
import { GROUPS, MUSCLES, musclesOfGroup, type GroupId, type MuscleId } from '../../data/muscles';
import { useApp } from '../../store';

const DURATIONS = [10, 15, 20, 30, 45, 60];
const INTENSITIES = ['Suave', 'Moderada', 'Alta', 'Extrema'];
const LEVELS = ['Principiante', 'Intermedio', 'Avanzado'];

export default function Entrenar() {
  const { theme, settings, updateSettings, user, say, setRoutine, groupLoad, muscleLoad, history } = useApp();
  const router = useRouter();
  const [type, setType] = useState<TrainingType>('hiit');
  const [pickMode, setPickMode] = useState<'group' | 'muscle'>('group');
  const [muscles, setMuscles] = useState<MuscleId[]>([]);
  const [minutes, setMinutes] = useState(20);
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4>(2);
  const [level, setLevel] = useState<1 | 2 | 3>(2);
  const [rounds, setRounds] = useState(3);
  const [reps, setReps] = useState(12);
  const [equipment, setEquipment] = useState<Equipment[]>(settings.plan?.equipment ?? []);
  const [period, setPeriod] = useState<7 | 30>(30);

  useEffect(() => {
    const t = setTimeout(() => say(phrase('greet', settings.agentLevel), { mood: 'happy', priority: 'normal' }), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const toggleMuscle = (m: MuscleId) => {
    if (pickMode === 'group') {
      const g = musclesOfGroup(MUSCLES[m].group);
      const all = g.every((x) => muscles.includes(x));
      setMuscles(all ? muscles.filter((x) => !g.includes(x)) : [...new Set([...muscles, ...g])]);
    } else {
      setMuscles(muscles.includes(m) ? muscles.filter((x) => x !== m) : [...muscles, m]);
    }
  };
  const toggleGroup = (g: GroupId) => toggleMuscle(musclesOfGroup(g)[0]);
  const groupActive = (g: GroupId) => musclesOfGroup(g).some((m) => muscles.includes(m));

  const load = useMemo(() => groupLoad(period), [groupLoad, period]);
  const mLoad = useMemo(() => muscleLoad(period), [muscleLoad, period]);
  const maxG = Math.max(1, ...Object.values(load));
  const maxM = Math.max(1, ...Object.values(mLoad));
  const heat = Object.fromEntries(Object.entries(mLoad).map(([k, v]) => [k, v / maxM]));
  const analysis = analyzeBalance(load, settings.agentLevel);
  const sessions = history.filter((h) => h.date >= new Date(Date.now() - period * 864e5).toISOString().slice(0, 10)).length;
  const typeColor = TRAINING_TYPES.find((t) => t.id === type)!.color;
  /** Sesiones de los últimos 7 días (se muestra en la cabecera) */
  const weekSessions = history.filter((h) => h.date >= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)).length;

  const plan = settings.plan;
  const today = new Date().getDay();
  const todayPlan = plan?.schedule.find((d) => d.weekday === today);
  const nextPlan = plan && !todayPlan ? [1, 2, 3, 4, 5, 6].map((i) => plan.schedule.find((d) => d.weekday === (today + i) % 7)).find(Boolean) : undefined;
  const WD = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const generate = () => {
    const opts: RoutineOptions = { type, muscles, minutes, intensity, level, equipment, rounds, reps, exclude: plan?.exclude };
    const r = generateRoutine(opts, settings.agentLevel);
    setRoutine(r);
    router.push('/rutina');
    setTimeout(() => say(r.note, { mood: 'hype', priority: 'high' }), 350);
  };

  const startPlanDay = () => {
    if (!plan || !todayPlan) return;
    const r = generateRoutine(planDayOptions(plan, todayPlan), settings.agentLevel);
    setRoutine({ ...r, title: todayPlan.label, fromPlan: true });
    router.push('/rutina');
    setTimeout(() => say(r.note, { mood: 'hype', priority: 'high' }), 350);
  };

  /** Copia las opciones del día del plan al editor para ajustarlas a mano. */
  const loadPlanDay = () => {
    const day = todayPlan ?? nextPlan;
    if (!plan || !day) return;
    const o = planDayOptions(plan, day);
    setType(o.type);
    setMuscles(o.muscles);
    setMinutes(o.minutes);
    setIntensity(o.intensity);
    setLevel(o.level);
    setEquipment(o.equipment);
    setRounds(o.rounds);
    setReps(o.reps);
    say('Cargué las opciones del plan. Ajusta lo que quieras y genera.', { priority: 'normal' });
  };

  return (
    <Screen
      title={`Hola, ${user?.name ?? 'atleta'}`}
      subtitle="¿Qué entrenamos hoy?"
      right={
        <LinearGradient
          colors={[theme.primary, theme.primary2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }}
        >
          <Icon name="fire" size={16} color={theme.onPrimary} />
          <Text style={{ color: theme.onPrimary, fontWeight: '900', marginLeft: 4 }}>
            {weekSessions} {weekSessions === 1 ? 'sesión' : 'sesiones'}
          </Text>
        </LinearGradient>
      }
    >
      {/* Nivel y reto actual */}
      {settings.progress ? (
        <Pressable onPress={() => router.push('/progreso')} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
            <LinearGradient colors={[theme.primary, theme.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.onPrimary, fontSize: 9, fontWeight: '900', marginBottom: -3 }}>NV</Text>
              <Text style={{ color: theme.onPrimary, fontSize: 22, fontWeight: '900' }}>{settings.progress.level}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ color: theme.text, fontWeight: '900', fontSize: 15 }}>{titleFor(settings.progress.level)}</Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>
                  {Math.max(0, settings.progress.xp - xpForLevel(settings.progress.level))} / {xpForLevel(settings.progress.level + 1) - xpForLevel(settings.progress.level)} XP
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: theme.cardAlt, borderRadius: 3, marginTop: 5, overflow: 'hidden' }}>
                <LinearGradient
                  colors={[theme.primary, theme.primary2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: 6,
                    width: `${Math.min(1, (settings.progress.xp - xpForLevel(settings.progress.level)) / (xpForLevel(settings.progress.level + 1) - xpForLevel(settings.progress.level))) * 100}%`,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Icon name={settings.progress.challenge.done ? 'check-decagram' : 'sword-cross'} size={13} color={settings.progress.challenge.done ? theme.success : theme.accent} />
                <Text style={{ color: theme.muted, fontSize: 11, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                  {settings.progress.challenge.done ? 'Reto superado · consigue el XP para subir' : `Reto: ${settings.progress.challenge.title}`}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={22} color={theme.muted} style={{ marginLeft: 4 }} />
          </Card>
        </Pressable>
      ) : null}

      {/* Plan semanal */}
      {plan ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, flex: 1 }}>META SEMANAL</Text>
              <Text style={{ color: theme.text, fontWeight: '900' }}>
                {Math.min(weekSessions, plan.weeklyGoal)}/{plan.weeklyGoal}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {Array.from({ length: plan.weeklyGoal }).map((_, i) => (
                <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, marginHorizontal: 2, backgroundColor: i < weekSessions ? theme.primary : theme.cardAlt }} />
              ))}
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>
              {weekSessions >= plan.weeklyGoal ? '¡Meta de la semana cumplida! 🎉' : `Te faltan ${plan.weeklyGoal - weekSessions} para cumplir la semana`}
            </Text>
          </View>
          {todayPlan ? (
            <LinearGradient colors={[TRAINING_TYPES.find((t) => t.id === todayPlan.type)!.color, shade(TRAINING_TYPES.find((t) => t.id === todayPlan.type)!.color)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>HOY TOCA</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 }}>{todayPlan.label}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>{plan.minutes} min · {planTime(plan)}</Text>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Pressable onPress={startPlanDay} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginRight: 8 }}>
                  <Icon name="play" size={18} color="#111" />
                  <Text style={{ color: '#111', fontWeight: '900', marginLeft: 4 }}>Entrenar ahora</Text>
                </Pressable>
                <Pressable onPress={loadPlanDay} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="tune-variant" size={18} color="#fff" />
                </Pressable>
              </View>
            </LinearGradient>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
              <Icon name="sofa-outline" size={22} color={theme.success} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>Hoy es día de recuperación</Text>
                {nextPlan ? (
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    Próximo: {nextPlan.label} el {WD[nextPlan.weekday]}
                  </Text>
                ) : null}
              </View>
              {nextPlan ? <Chip label="Adelantar" icon="fast-forward" onPress={loadPlanDay} /> : null}
            </View>
          )}
        </Card>
      ) : (
        <Pressable onPress={() => updateSettings({ onboardingDone: false })}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AgentFace mood="happy" size={44} color={theme.primary} color2={theme.primary2} bg={theme.card} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: theme.text, fontWeight: '800' }}>Crea tu plan con {settings.agentName}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>8 preguntas y tendrás una rutina semanal con objetivos</Text>
            </View>
            <Icon name="chevron-right" size={22} color={theme.muted} />
          </Card>
        </Pressable>
      )}

      {/* Tipo de entrenamiento */}
      <Label>Tipo de entrenamiento</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5, marginBottom: 10 }}>
        {TRAINING_TYPES.map((t) => {
          const a = t.id === type;
          const body = (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {a ? (
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={t.icon as any} size={22} color="#fff" />
                  </View>
                ) : (
                  <IconBadge icon={t.icon} color={t.color} />
                )}
                {a && <Icon name="check-circle" size={20} color="#fff" />}
              </View>
              <View>
                <Text style={{ color: a ? '#fff' : theme.text, fontWeight: '900', fontSize: 19, letterSpacing: -0.3 }}>{t.name}</Text>
                <Text style={{ color: a ? 'rgba(255,255,255,0.85)' : theme.muted, fontSize: 11 }} numberOfLines={1}>
                  {t.tagline}
                </Text>
              </View>
            </>
          );
          const box = { borderRadius: 22, padding: 14, height: 118, justifyContent: 'space-between' } as const;
          return (
            <Pressable key={t.id} onPress={() => {
                setType(t.id);
                setRounds(t.id === 'tabata' ? 8 : t.id === 'fuerza' ? 4 : 3);
              }} style={({ pressed }) => ({ width: '50%', padding: 5, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              {a ? (
                <LinearGradient
                  colors={[t.color, shade(t.color)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[box, { shadowColor: t.color, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]}
                >
                  {body}
                </LinearGradient>
              ) : (
                <View style={[box, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}>{body}</View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Zonas */}
      <Card>
        <SectionTitle
          right={
            muscles.length ? (
              <Pressable onPress={() => setMuscles([])} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="close-circle" size={16} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: '700', marginLeft: 4 }}>Limpiar</Text>
              </Pressable>
            ) : null
          }
        >
          Zonas a trabajar
        </SectionTitle>
        <Segmented
          value={pickMode}
          onChange={setPickMode}
          options={[
            { value: 'group', label: 'Grupos' },
            { value: 'muscle', label: 'Músculos específicos' },
          ]}
        />
        <View style={{ marginTop: 16 }}>
          <BodyMap selected={muscles} onPress={toggleMuscle} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
          {GROUPS.map((g) => (
            <Chip key={g.id} label={g.name} icon={g.icon} active={groupActive(g.id)} onPress={() => toggleGroup(g.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: 14, padding: 10, marginTop: 4 }}>
          <Icon name={muscles.length ? 'target' : 'human'} size={18} color={theme.primary} />
          <Text style={{ color: muscles.length ? theme.text : theme.muted, fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 17 }}>
            {muscles.length ? `${muscles.length} músculos: ${muscles.map((m) => MUSCLES[m].name).join(' · ')}` : 'Sin selección: se generará una rutina de cuerpo completo'}
          </Text>
        </View>
      </Card>

      {/* Opciones */}
      <Card>
        <SectionTitle>Opciones</SectionTitle>
        <Label>Duración</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DURATIONS.map((d) => (
            <Chip key={d} label={`${d} min`} active={minutes === d} onPress={() => setMinutes(d)} />
          ))}
        </View>
        <Label>Intensidad</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {INTENSITIES.map((l, i) => (
            <Chip key={l} label={l} active={intensity === i + 1} onPress={() => setIntensity((i + 1) as 1 | 2 | 3 | 4)} />
          ))}
        </View>
        <Label>Nivel</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {LEVELS.map((l, i) => (
            <Chip key={l} label={l} active={level === i + 1} onPress={() => setLevel((i + 1) as 1 | 2 | 3)} />
          ))}
        </View>
        <Label>Equipo disponible</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {EQUIPMENT.filter((e) => e.id !== 'ninguno').map((e) => (
            <Chip
              key={e.id}
              label={e.name}
              active={equipment.includes(e.id)}
              onPress={() => setEquipment(equipment.includes(e.id) ? equipment.filter((x) => x !== e.id) : [...equipment, e.id])}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>{type === 'fuerza' ? 'Series' : 'Rondas por ejercicio'}</Text>
          <Stepper value={rounds} onChange={setRounds} min={1} max={10} />
        </View>
        {type === 'fuerza' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>Repeticiones</Text>
            <Stepper value={reps} onChange={setReps} min={4} max={30} />
          </View>
        )}
      </Card>

      <Button label={`Generar rutina con ${settings.agentName}`} icon="creation" onPress={generate} colors={[typeColor, shade(typeColor)]} style={{ marginBottom: 26 }} />

      {/* Estadísticas */}
      <Card>
        <SectionTitle
          right={
            <View style={{ width: 130 }}>
              <Segmented value={period} onChange={setPeriod} options={[{ value: 7, label: '7 d' }, { value: 30, label: '30 d' }]} />
            </View>
          }
        >
          Balance muscular
        </SectionTitle>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <Stat icon="calendar-check" label="Sesiones" value={String(sessions)} />
          <Stat icon="timer-outline" label="Minutos" value={String(Math.round(Object.values(load).reduce((a, b) => a + b, 0)))} />
          <Stat icon="trophy-outline" label="Grupo top" value={analysis.most.name} />
        </View>
        <BodyMap mode="heat" heat={heat} width={260} showLabel={false} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: theme.muted, fontSize: 11, marginRight: 6 }}>Menos</Text>
          <LinearGradient colors={[theme.bodyBase, theme.primary, theme.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 90, height: 6, borderRadius: 3 }} />
          <Text style={{ color: theme.muted, fontSize: 11, marginLeft: 6 }}>Más trabajo</Text>
        </View>
        <View>
          <View>
            {GROUPS.map((g) => {
              const v = load[g.id];
              const low = g.id === analysis.least.id;
              return (
                <View key={g.id} style={{ marginBottom: 9 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ color: low ? theme.danger : theme.text, fontSize: 12, fontWeight: '600' }}>{g.name}</Text>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>{Math.round(v)} min</Text>
                  </View>
                  <View style={{ height: 7, backgroundColor: theme.cardAlt, borderRadius: 4 }}>
                    <View style={{ height: 7, width: `${Math.max(3, (v / maxG) * 100)}%`, backgroundColor: low ? theme.danger : theme.primary, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: theme.primarySoft, borderRadius: 16, padding: 12, marginTop: 8, alignItems: 'center' }}>
          <AgentFace mood={analysis.balanced ? 'happy' : 'alert'} size={40} color={theme.primary} bg={theme.card} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>{settings.agentName} analiza</Text>
            <Text style={{ color: theme.text, fontSize: 13, lineHeight: 18 }}>{analysis.message}</Text>
          </View>
        </View>
        {sessions > 0 && <Button
          label={`Enfocar hoy en ${analysis.least.name}`}
          variant="soft"
          icon="target"
          style={{ marginTop: 10 }}
          onPress={() => {
            setPickMode('group');
            setMuscles(musclesOfGroup(analysis.least.id));
            say(`¡Hecho! Seleccioné ${analysis.least.name.toLowerCase()}. Ajusta las opciones y genera.`, { priority: 'high' });
          }}
        />}
      </Card>
    </Screen>
  );

  function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.cardAlt, borderRadius: 16, padding: 12, marginRight: 6 }}>
        <Icon name={icon as any} size={16} color={theme.primary} />
        <Text style={{ color: theme.text, fontWeight: '900', fontSize: 18, marginTop: 4 }} numberOfLines={1}>
          {value}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 11 }}>{label}</Text>
      </View>
    );
  }
}
