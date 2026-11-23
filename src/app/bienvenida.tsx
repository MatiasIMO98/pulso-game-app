import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AGENT_LEVELS, generateRoutine, type AgentLevel } from '../agent/agent';
import { buildPlan, DAY_TIMES, GOALS, LEVELS, LIMITATIONS, planDayOptions, type DayTime, type Goal, type Limitation, type PlanAnswers } from '../agent/plan';
import { AgentFace } from '../components/AgentDock';
import { BodyMap } from '../components/BodyMap';
import { Button, Chip, Icon, shade, Toggle } from '../components/ui';
import { EQUIPMENT, typeInfo, type Equipment } from '../data/exercises';
import { GROUPS, MUSCLES, type GroupId } from '../data/muscles';
import { useApp } from '../store';

const WEEK = [
  { d: 1, short: 'L', name: 'Lunes' },
  { d: 2, short: 'M', name: 'Martes' },
  { d: 3, short: 'X', name: 'Miércoles' },
  { d: 4, short: 'J', name: 'Jueves' },
  { d: 5, short: 'V', name: 'Viernes' },
  { d: 6, short: 'S', name: 'Sábado' },
  { d: 0, short: 'D', name: 'Domingo' },
];
const dayName = (d: number) => WEEK.find((w) => w.d === d)!.name;
const DURATIONS = [15, 20, 30, 45, 60];
const STEPS = 8;

type Step = 'intro' | number | 'summary';

export default function Bienvenida() {
  const { theme, settings, updateSettings, user, savePlan, skipOnboarding, addMeasure, setRoutine, say } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('intro');

  // Respuestas
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [dayTime, setDayTime] = useState<DayTime>('tarde');
  const [minutes, setMinutes] = useState(30);
  const [priorities, setPriorities] = useState<GroupId[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [limitations, setLimitations] = useState<Limitation[]>([]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [toCalendar, setToCalendar] = useState(true);

  const answers: PlanAnswers | null = goal && level ? { goal, level, weekdays, dayTime, minutes, priorities, equipment, limitations } : null;
  const plan = useMemo(() => (step === 'summary' && answers ? buildPlan(answers, settings.agentLevel) : null), [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = user?.name.split(' ')[0] ?? 'atleta';
  const agent = settings.agentName;
  const index = typeof step === 'number' ? step : step === 'intro' ? -1 : STEPS;

  const valid = (() => {
    if (step === 0) return !!goal;
    if (step === 1) return !!level;
    if (step === 2) return weekdays.length > 0;
    return true;
  })();

  const NOVA_LINES: Record<number, string> = {
    0: '¿Qué quieres conseguir? Elige tu objetivo principal.',
    1: '¿Cómo describirías tu forma física ahora mismo? Sin juzgar, solo para ajustar la intensidad.',
    2: '¿Qué días puedes entrenar? Mejor pocos y constantes que muchos y saltados.',
    3: '¿Cuánto tiempo tienes en cada sesión?',
    4: '¿Hay zonas que quieras priorizar? Tócalas en el cuerpo o déjalo vacío para un plan equilibrado.',
    5: '¿Con qué equipo cuentas? Sin nada también se puede entrenar muy bien.',
    6: '¿Alguna molestia o lesión? Evitaré los ejercicios que puedan afectarla.',
    7: 'Por último: ¿cómo quieres que te acompañe? Y si quieres, tus medidas de partida.',
  };

  const next = () => {
    if (typeof step === 'number') setStep(step + 1 >= STEPS ? 'summary' : step + 1);
  };
  const back = () => {
    if (step === 'summary') setStep(STEPS - 1);
    else if (typeof step === 'number') setStep(step === 0 ? 'intro' : step - 1);
  };

  const finish = (startNow: boolean) => {
    if (!plan) return;
    const w = parseFloat(weight.replace(',', '.'));
    const h = parseFloat(height.replace(',', '.'));
    if (!isNaN(w)) addMeasure('peso', w);
    if (!isNaN(h)) addMeasure('altura', h);
    const created = savePlan(plan, toCalendar);
    if (startNow) {
      // Primer entrenamiento: hoy si toca, si no el primer día del plan
      const today = new Date().getDay();
      const day = plan.schedule.find((d) => d.weekday === today) ?? plan.schedule[0];
      const r = generateRoutine(planDayOptions(plan, day), settings.agentLevel);
      setRoutine({ ...r, title: day.label, fromPlan: true });
      setTimeout(() => router.push('/rutina'), 80);
      // Después del saludo de la pantalla Entrenar, que se monta al cerrar el cuestionario
      setTimeout(() => say('¡Tu primer entrenamiento! Empezamos suave y vamos subiendo.', { mood: 'hype', priority: 'high' }), 1000);
    } else {
      setTimeout(() => say(toCalendar ? `¡Plan guardado! Marqué ${created} sesiones en tu calendario.` : '¡Plan guardado! Lo verás cada día en Entrenar.', { priority: 'high' }), 1000);
    }
  };

  // ---------- Pantallas ----------

  const Option = ({ icon, title, desc, active, onPress, color }: { icon: string; title: string; desc?: string; active: boolean; onPress: () => void; color?: string }) => {
    const c = color ?? theme.primary;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: active ? c + '1F' : theme.card,
          borderWidth: 1.5,
          borderColor: active ? c : theme.border,
          borderRadius: 20,
          padding: 14,
          marginBottom: 10,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: active ? c : theme.cardAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Icon name={icon as any} size={22} color={active ? '#fff' : c} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{title}</Text>
          {desc ? <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{desc}</Text> : null}
        </View>
        <Icon name={active ? 'check-circle' : 'circle-outline'} size={22} color={active ? c : theme.border} />
      </Pressable>
    );
  };

  const Novabubble = ({ text, mood = 'happy' }: { text: string; mood?: 'happy' | 'hype' | 'calm' }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 }}>
      <AgentFace mood={mood} size={52} color={theme.primary} color2={theme.primary2} bg={theme.bg} />
      <View style={{ flex: 1, marginLeft: 10, backgroundColor: theme.card, borderRadius: 18, borderBottomLeftRadius: 6, padding: 12, borderWidth: 1, borderColor: theme.border }}>
        <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 2 }}>{agent.toUpperCase()}</Text>
        <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{text}</Text>
      </View>
    </View>
  );

  const input = { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: theme.text, fontSize: 15, flex: 1 } as const;

  const body = () => {
    switch (step) {
      case 0:
        return GOALS.map((g) => <Option key={g.id} icon={g.icon} title={g.name} desc={g.desc} active={goal === g.id} onPress={() => setGoal(g.id)} />);
      case 1:
        return LEVELS.map((l) => <Option key={l.id} icon={l.icon} title={l.name} desc={l.desc} active={level === l.id} onPress={() => setLevel(l.id)} />);
      case 2:
        return (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              {WEEK.map((w) => {
                const a = weekdays.includes(w.d);
                return (
                  <Pressable
                    key={w.d}
                    onPress={() => setWeekdays(a ? weekdays.filter((x) => x !== w.d) : [...weekdays, w.d])}
                    style={{ width: 42, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: a ? theme.primary : theme.card, borderWidth: 1, borderColor: a ? theme.primary : theme.border }}
                  >
                    <Text style={{ color: a ? theme.onPrimary : theme.text, fontWeight: '900', fontSize: 16 }}>{w.short}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 20, textAlign: 'center' }}>
              {weekdays.length ? `${weekdays.length} ${weekdays.length === 1 ? 'día' : 'días'} por semana` : 'Elige al menos un día'}
              {weekdays.length >= 6 ? ' · ¡recuerda dejar algún día para recuperar!' : ''}
            </Text>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginBottom: 10 }}>¿A qué hora prefieres?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {DAY_TIMES.map((t) => {
                const a = dayTime === t.id;
                return (
                  <Pressable key={t.id} onPress={() => setDayTime(t.id)} style={{ width: '50%', padding: 4 }}>
                    <View style={{ backgroundColor: a ? theme.primary + '1F' : theme.card, borderWidth: 1.5, borderColor: a ? theme.primary : theme.border, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name={t.icon as any} size={22} color={a ? theme.primary : theme.muted} />
                      <View style={{ marginLeft: 10 }}>
                        <Text style={{ color: theme.text, fontWeight: '800' }}>{t.name}</Text>
                        <Text style={{ color: theme.muted, fontSize: 11 }}>{t.time}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        );
      case 3:
        return DURATIONS.map((m) => (
          <Option
            key={m}
            icon="timer-outline"
            title={`${m} minutos`}
            desc={m <= 15 ? 'Rápido e intenso' : m <= 30 ? 'Ideal para la constancia' : m <= 45 ? 'Sesión completa' : 'Sesión larga y exigente'}
            active={minutes === m}
            onPress={() => setMinutes(m)}
          />
        ));
      case 4:
        return (
          <>
            <BodyMap
              selected={GROUPS.filter((g) => priorities.includes(g.id)).flatMap((g) => (Object.keys(MUSCLES) as (keyof typeof MUSCLES)[]).filter((m) => MUSCLES[m].group === g.id))}
              onPress={(m) => {
                const g = MUSCLES[m].group;
                setPriorities(priorities.includes(g) ? priorities.filter((x) => x !== g) : [...priorities, g]);
              }}
              showLabel={false}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
              <Chip label="Equilibrado" icon="scale-balance" active={priorities.length === 0} onPress={() => setPriorities([])} />
              {GROUPS.map((g) => (
                <Chip key={g.id} label={g.name} icon={g.icon} active={priorities.includes(g.id)} onPress={() => setPriorities(priorities.includes(g.id) ? priorities.filter((x) => x !== g.id) : [...priorities, g.id])} />
              ))}
            </View>
          </>
        );
      case 5:
        return (
          <>
            <Option icon="human" title="Sin equipo" desc="Solo con mi peso corporal" active={equipment.length === 0} onPress={() => setEquipment([])} />
            {EQUIPMENT.filter((e) => e.id !== 'ninguno').map((e) => (
              <Option
                key={e.id}
                icon={e.id === 'mancuernas' ? 'dumbbell' : e.id === 'barra' ? 'weight-lifter' : 'vector-curve'}
                title={e.name}
                active={equipment.includes(e.id)}
                onPress={() => setEquipment(equipment.includes(e.id) ? equipment.filter((x) => x !== e.id) : [...equipment, e.id])}
              />
            ))}
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center' }}>Puedes elegir varios</Text>
          </>
        );
      case 6:
        return (
          <>
            <Option icon="check-decagram" title="Ninguna" desc="Puedo hacer cualquier ejercicio" active={limitations.length === 0} onPress={() => setLimitations([])} color={theme.success} />
            {LIMITATIONS.map((l) => (
              <Option
                key={l.id}
                icon="bandage"
                title={l.name}
                desc={`Evitaré ${l.avoid.length} ejercicios: ${l.avoid.slice(0, 2).join(', ')}…`}
                active={limitations.includes(l.id)}
                color={theme.accent}
                onPress={() => setLimitations(limitations.includes(l.id) ? limitations.filter((x) => x !== l.id) : [...limitations, l.id])}
              />
            ))}
            <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }}>
              {agent} no sustituye a un profesional de la salud. Si tienes una lesión, consulta con tu médico o fisioterapeuta antes de empezar.
            </Text>
          </>
        );
      case 7:
        return (
          <>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginBottom: 10 }}>Estilo de {agent}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              {AGENT_LEVELS.map((l) => {
                const a = l.level === settings.agentLevel;
                return (
                  <Pressable key={l.level} onPress={() => updateSettings({ agentLevel: l.level as AgentLevel })} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: a ? theme.primary : theme.card, borderWidth: 1, borderColor: a ? theme.primary : theme.border }}>
                      <Text style={{ color: a ? theme.onPrimary : theme.text, fontWeight: '900', fontSize: 16 }}>{l.level}</Text>
                    </View>
                    <Text style={{ color: a ? theme.primary : theme.muted, fontSize: 10, fontWeight: '700', marginTop: 4 }}>{l.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginBottom: 24 }}>{AGENT_LEVELS[settings.agentLevel - 1].desc}</Text>

            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15, marginBottom: 4 }}>Medidas de partida (opcional)</Text>
            <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 10 }}>Así podré enseñarte tu progreso desde el primer día.</Text>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', marginBottom: 4 }}>PESO (kg)</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput value={weight} onChangeText={setWeight} placeholder="72.5" placeholderTextColor={theme.muted} keyboardType="decimal-pad" style={input} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', marginBottom: 4 }}>ALTURA (cm)</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TextInput value={height} onChangeText={setHeight} placeholder="175" placeholderTextColor={theme.muted} keyboardType="decimal-pad" style={input} />
                </View>
              </View>
            </View>
          </>
        );
    }
    return null;
  };

  // ---------- Introducción ----------
  if (step === 'intro') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <LinearGradient colors={[theme.primary + '40', theme.bg]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 420 }} />
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, paddingHorizontal: 24, paddingBottom: insets.bottom + 32, flexGrow: 1 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ shadowColor: theme.primary, shadowOpacity: 0.6, shadowRadius: 30, elevation: 10, borderRadius: 999 }}>
              <AgentFace mood="hype" size={110} color={theme.primary} color2={theme.primary2} bg={theme.bg} />
            </View>
            <Text style={{ color: theme.text, fontSize: 30, fontWeight: '900', marginTop: 20, textAlign: 'center', letterSpacing: -0.6 }}>¡Hola, {name}!</Text>
            <Text style={{ color: theme.muted, fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              Soy {agent}, tu coach. Antes de empezar, ¿quieres que preparemos juntos tu primera rutina?
            </Text>
          </View>

          <Pressable onPress={() => setStep(0)} style={({ pressed }) => ({ marginTop: 36, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
            <LinearGradient colors={[theme.primary, theme.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="creation" size={26} color="#fff" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>Sí, guíame</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2 }}>8 preguntas rápidas · plan semanal con objetivos</Text>
                </View>
                <Icon name="arrow-right" size={22} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => {
              skipOnboarding();
              setTimeout(() => say('¡Perfecto! Elige el tipo y las zonas, y genero la rutina al momento.', { priority: 'high' }), 300);
            }}
            style={({ pressed }) => ({ marginTop: 12, backgroundColor: theme.card, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.85 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="tune-variant" size={24} color={theme.text} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '900', fontSize: 17 }}>Prefiero crearla yo</Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>Ir directo a elegir tipo, zonas y opciones</Text>
              </View>
              <Icon name="arrow-right" size={22} color={theme.muted} />
            </View>
          </Pressable>

          <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 'auto', paddingTop: 24 }}>Puedes repetir este cuestionario cuando quieras desde Ajustes.</Text>
        </ScrollView>
      </View>
    );
  }

  // ---------- Resumen del plan ----------
  if (step === 'summary' && plan) {
    const goalInfo = GOALS.find((g) => g.id === plan.goal)!;
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 40 }}>
          <Pressable onPress={back} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Icon name="chevron-left" size={22} color={theme.muted} />
            <Text style={{ color: theme.muted, fontWeight: '700' }}>Ajustar respuestas</Text>
          </Pressable>
          <Novabubble text={plan.headline} mood="hype" />

          <LinearGradient colors={[theme.primary, theme.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name={goalInfo.icon as any} size={26} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20, marginLeft: 8 }}>{goalInfo.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              {[
                [String(plan.weeklyGoal), 'sesiones / semana'],
                [String(plan.minutes), 'min por sesión'],
                [String(plan.weeklyGoal * plan.minutes), 'min / semana'],
              ].map(([v, l]) => (
                <View key={l} style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 24 }}>{v}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>{l}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 }}>TU SEMANA</Text>
          {plan.schedule.map((d) => {
            const t = typeInfo(d.type);
            return (
              <View key={d.weekday} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 18, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border }}>
                <LinearGradient colors={[t.color, shade(t.color)]} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Icon name={t.icon as any} size={22} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800' }}>
                    {dayName(d.weekday).toUpperCase()} · {DAY_TIMES.find((x) => x.id === plan.dayTime)!.time}
                  </Text>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>{d.label}</Text>
                </View>
                <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{plan.minutes}′</Text>
              </View>
            );
          })}

          <View style={{ backgroundColor: theme.card, borderRadius: 18, padding: 14, marginTop: 8, borderWidth: 1, borderColor: theme.border }}>
            {[
              ['speedometer', `Intensidad: ${['Suave', 'Moderada', 'Alta', 'Extrema'][plan.intensity - 1]} (nivel ${LEVELS.find((l) => l.id === plan.level)!.name.toLowerCase()})`],
              ['dumbbell', plan.equipment.length ? `Equipo: ${plan.equipment.map((e) => EQUIPMENT.find((x) => x.id === e)!.name).join(', ')}` : 'Sin equipo: solo peso corporal'],
              ['target', plan.priorities.length ? `Prioridad: ${plan.priorities.map((p) => GROUPS.find((g) => g.id === p)!.name).join(', ')}` : 'Enfoque equilibrado en todo el cuerpo'],
              ...(plan.exclude.length ? [['bandage', `Evitaré ${plan.exclude.length} ejercicios por: ${plan.limitations.map((l) => LIMITATIONS.find((x) => x.id === l)!.name.toLowerCase()).join(', ')}`]] : []),
            ].map(([ic, text]) => (
              <View key={text} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
                <Icon name={ic as any} size={18} color={theme.primary} />
                <Text style={{ color: theme.text, fontSize: 13, marginLeft: 10, flex: 1 }}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, borderWidth: 1, borderColor: theme.border }}>
            <Icon name="calendar-plus" size={20} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>Añadir al calendario</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Próximas 4 semanas, con recordatorios</Text>
            </View>
            <Toggle value={toCalendar} onChange={setToCalendar} />
          </View>

          <Button label="Empezar mi primer entrenamiento" icon="play" onPress={() => finish(true)} style={{ marginTop: 20 }} />
          <Button label="Guardar plan y ver inicio" variant="ghost" onPress={() => finish(false)} style={{ marginTop: 10 }} />
        </ScrollView>
      </View>
    );
  }

  // ---------- Pregunta ----------
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={back} hitSlop={10} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', color: theme.muted, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>
            PASO {index + 1} DE {STEPS}
          </Text>
          <Pressable
            onPress={() => {
              skipOnboarding();
            }}
            hitSlop={10}
          >
            <Text style={{ color: theme.muted, fontWeight: '700' }}>Saltar</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, marginHorizontal: 2, backgroundColor: i <= index ? theme.primary : theme.card }} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Novabubble text={NOVA_LINES[index]} />
        {body()}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.bg }}>
        <Button
          label={index === STEPS - 1 ? 'Crear mi plan' : 'Siguiente'}
          icon={index === STEPS - 1 ? 'creation' : 'arrow-right'}
          onPress={valid ? next : undefined}
          style={{ opacity: valid ? 1 : 0.45 }}
        />
      </View>
    </View>
  );
}
