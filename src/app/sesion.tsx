import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { phrase, type RoutineItem } from '../agent/agent';
import { stepXp, titleFor, xpForLevel, type Reward } from '../agent/progress';
import { AgentFace, PREP_COLOR } from '../components/AgentDock';
import { Button, fmtTime, Icon, shade } from '../components/ui';
import { typeInfo } from '../data/exercises';
import { GROUPS, MUSCLES } from '../data/muscles';
import { useApp } from '../store';

type Step = { phase: 'prep' | 'work' | 'rest' | 'set'; sec: number; ex: number; round: number };

function buildSteps(items: RoutineItem[], strength: boolean): Step[] {
  const s: Step[] = [{ phase: 'prep', sec: 10, ex: 0, round: 0 }];
  items.forEach((it, ex) => {
    for (let r = 0; r < it.rounds; r++) {
      s.push({ phase: strength ? 'set' : 'work', sec: strength ? 0 : it.work, ex, round: r });
      const last = ex === items.length - 1 && r === it.rounds - 1;
      if (!last) s.push({ phase: 'rest', sec: it.rest, ex, round: r });
    }
  });
  return s;
}

const PHASE = { prep: 'PREPÁRATE', work: 'A TOPE', rest: 'DESCANSO', set: 'SERIE' } as const;
const PHASE_ICON = { prep: 'run', work: 'lightning-bolt', rest: 'weather-windy', set: 'dumbbell' } as const;
const native = Platform.OS !== 'web';

export default function Sesion() {
  const { theme, routine, settings, say, setAgentStatus, completeWorkout } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const strength = routine?.type === 'fuerza';
  const steps = useMemo(() => (routine ? buildSteps(routine.items, !!strength) : []), [routine, strength]);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(steps[0]?.sec ?? 0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const elapsed = useRef(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const L = settings.agentLevel;

  // ---- Experiencia en vivo ----
  const completedSteps = useRef(new Set<number>());
  const [liveXp, setLiveXp] = useState(0);
  const [lastGain, setLastGain] = useState(0);
  const xpPop = useRef(new Animated.Value(0)).current;
  const [reward, setReward] = useState<Reward | null>(null);

  /** Marca un intervalo/serie como completado y suma su XP. Saltarlo no da XP. */
  const markDone = (i: number) => {
    const s = steps[i];
    if (!routine || !s || (s.phase !== 'work' && s.phase !== 'set') || completedSteps.current.has(i)) return;
    completedSteps.current.add(i);
    const gain = stepXp(routine.items[s.ex], routine.options.intensity);
    setLiveXp((x) => x + gain);
    setLastGain(gain);
    xpPop.setValue(0);
    Animated.timing(xpPop, { toValue: 1, duration: 1100, useNativeDriver: native }).start();
  };

  const step = steps[idx];
  const item = routine?.items[step?.ex ?? 0];
  const nextWork = steps.slice(idx + 1).find((s) => s.phase === 'work' || s.phase === 'set');
  const nextItem = nextWork ? routine?.items[nextWork.ex] : undefined;
  const typeColor = routine ? typeInfo(routine.type).color : theme.primary;
  const color = step?.phase === 'rest' ? theme.success : step?.phase === 'prep' ? PREP_COLOR : typeColor;

  const goTo = (i: number) => {
    if (i >= steps.length) {
      setDone(true);
      return;
    }
    setIdx(i);
    setRemaining(steps[i].sec);
  };

  // Pulso visual al cambiar de fase
  useEffect(() => {
    pulse.setValue(0.9);
    Animated.spring(pulse, { toValue: 1, friction: 4, tension: 90, useNativeDriver: native }).start();
  }, [idx, pulse]);

  // Mensajes del agente al cambiar de fase
  useEffect(() => {
    if (!step || !routine || done) return;
    const ex = routine.items[step.ex].exercise.name;
    if (step.phase === 'prep') say(`Primero: ${ex}. ¡Ponte en posición!`, { mood: 'focus', priority: 'high' });
    else if (step.phase === 'work' || step.phase === 'set') {
      if (step.round === 0) say(phrase('workStart', L, { ex }), { mood: 'hype', priority: 'normal' });
    } else if (step.phase === 'rest') {
      const next = nextItem && nextWork && nextWork.ex !== step.ex ? nextItem.exercise.name : `${ex} (ronda ${step.round + 2})`;
      say(phrase('rest', L, { next }), { mood: 'calm', priority: 'high' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, done]);

  // Cronómetro
  useEffect(() => {
    if (paused || done || !step || step.phase === 'set') return;
    const t = setInterval(() => {
      elapsed.current += 1;
      setRemaining((r) => r - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [paused, done, step]);

  useEffect(() => {
    if (!step || done) return;
    if (step.phase !== 'set' && remaining <= 0) {
      if (step.phase === 'work') markDone(idx);
      goTo(idx + 1);
    }
    else if (remaining === 3 && settings.countdownBeep) say(phrase('last3', L), { mood: 'alert', priority: 'normal' });
    else if (step.phase === 'work' && remaining === Math.floor(step.sec / 2) && step.sec >= 30) say(phrase('mid', L), { mood: 'hype', priority: 'low' });
    setAgentStatus({ phase: step.phase, remaining: Math.max(0, remaining), total: step.sec, label: item?.exercise.name ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, idx]);

  useEffect(() => {
    if (!done || !routine) return;
    setAgentStatus(null);
    const doneByItem = routine.items.map(() => 0);
    completedSteps.current.forEach((i) => (doneByItem[steps[i].ex] += 1));
    const r = completeWorkout({
      items: routine.items,
      done: doneByItem,
      intensity: routine.options.intensity,
      minutes: Math.max(1, Math.round(elapsed.current / 60)),
      type: routine.type,
      fromPlan: !!routine.fromPlan,
      challengeId: routine.challengeId,
      streak: false,
    });
    setReward(r);
    if (r && r.levelAfter > r.levelBefore) say(`¡SUBISTE A NIVEL ${r.levelAfter}! ${titleFor(r.levelAfter)}. ¡Mira tu nuevo reto!`, { mood: 'hype', priority: 'high' });
    else if (r?.challengeCompleted) say('¡Reto superado! Junta el XP que falta y subes de nivel.', { mood: 'hype', priority: 'high' });
    else say(phrase('done', L), { mood: 'hype', priority: 'high' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => () => setAgentStatus(null), [setAgentStatus]);

  if (!routine || !step || !item) return null;

  const exit = () => {
    setAgentStatus(null);
    router.replace('/');
  };

  // ---------- Resumen final ----------
  if (done) {
    const p = settings.progress;
    const levelUp = reward && reward.levelAfter > reward.levelBefore;
    const nextNeed = p ? xpForLevel(p.level + 1) : 0;
    const prevNeed = p ? xpForLevel(p.level) : 0;
    const pct = p ? Math.min(1, (p.xp - prevNeed) / Math.max(1, nextNeed - prevNeed)) : 0;
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <LinearGradient colors={[(levelUp ? theme.accent : typeColor) + '55', theme.bg]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 420 }} />
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 20, paddingBottom: 140, alignItems: 'center' }}>
          <View style={{ shadowColor: theme.primary, shadowOpacity: 0.6, shadowRadius: 30, elevation: 10, borderRadius: 999 }}>
            <AgentFace mood="hype" size={104} color={theme.primary} color2={theme.primary2} bg={theme.bg} />
          </View>
          <Text style={{ color: theme.text, fontSize: 32, fontWeight: '900', marginTop: 16, letterSpacing: -0.8 }}>{levelUp ? `¡Nivel ${reward!.levelAfter}!` : '¡Completado!'}</Text>
          <Text style={{ color: theme.muted, marginTop: 2 }}>{levelUp ? `Ahora eres ${titleFor(reward!.levelAfter)}` : routine.title}</Text>

          {/* XP ganado */}
          {reward ? (
            <View style={{ alignSelf: 'stretch', backgroundColor: theme.card, borderRadius: 24, padding: 16, marginTop: 20, borderWidth: 1, borderColor: theme.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="lightning-bolt" size={26} color={theme.accent} />
                <Text style={{ color: theme.text, fontSize: 30, fontWeight: '900', marginLeft: 6 }}>+{reward.xp} XP</Text>
              </View>
              {reward.breakdown.map((b) => (
                <View key={b.label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                  <Icon name={b.icon as any} size={16} color={theme.muted} />
                  <Text style={{ color: theme.muted, fontSize: 13, marginLeft: 8, flex: 1 }}>{b.label}</Text>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 13 }}>+{b.xp}</Text>
                </View>
              ))}
              {reward.skipped > 0 ? (
                <Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>
                  {reward.skipped} {reward.skipped === 1 ? 'intervalo saltado' : 'intervalos saltados'} (no dan XP)
                </Text>
              ) : null}
              {p ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 12 }}>Nivel {p.level}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>
                      {p.xp} / {nextNeed} XP
                    </Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: theme.cardAlt, borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                    <LinearGradient colors={[theme.primary, theme.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct * 100}%`, height: 8 }} />
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {/* Reto */}
          {reward?.challengeCompleted ? (
            <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.success + '22', borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: theme.success }}>
              <Icon name="check-decagram" size={26} color={theme.success} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: theme.success, fontWeight: '900', fontSize: 12, letterSpacing: 0.6 }}>RETO SUPERADO</Text>
                <Text style={{ color: theme.text, fontSize: 13 }}>{reward.challengeCompleted.title}</Text>
                {!levelUp && p ? <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>Te faltan {Math.max(0, nextNeed - p.xp)} XP para subir de nivel</Text> : null}
              </View>
            </View>
          ) : null}
          {reward?.newChallenge ? (
            <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: theme.accent }}>
              <Icon name="sword-cross" size={24} color={theme.accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 12, letterSpacing: 0.6 }}>NUEVO RETO · NIVEL {reward.newChallenge.level + 1}</Text>
                <Text style={{ color: theme.text, fontSize: 13 }}>{reward.newChallenge.title}</Text>
              </View>
            </View>
          ) : null}
          {reward?.novaUnlock ? (
            <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primarySoft, borderRadius: 18, padding: 14, marginTop: 12 }}>
              <AgentFace mood="hype" size={44} color={theme.primary} color2={theme.primary2} bg={theme.card} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: theme.primary, fontWeight: '900', fontSize: 12, letterSpacing: 0.6 }}>{settings.agentName.toUpperCase()} EVOLUCIONÓ · {reward.novaUnlock.name.toUpperCase()}</Text>
                <Text style={{ color: theme.text, fontSize: 13 }}>Desbloqueado: {reward.novaUnlock.unlock}</Text>
              </View>
            </View>
          ) : null}

          {/* XP por grupo */}
          {reward && reward.groups.length ? (
            <View style={{ alignSelf: 'stretch', marginTop: 16 }}>
              <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>XP POR GRUPO MUSCULAR</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {reward.groups.map((g) => (
                  <View key={g.group} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: g.after > g.before ? theme.accent + '26' : theme.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: g.after > g.before ? theme.accent : theme.border }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12 }}>{GROUPS.find((x) => x.id === g.group)!.name}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12, marginLeft: 4 }}>+{g.xp}</Text>
                    {g.after > g.before ? <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 12, marginLeft: 4 }}>Nv {g.after} ▲</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', marginTop: 16, alignSelf: 'stretch' }}>
            {[
              ['timer-outline', fmtTime(elapsed.current), 'Tiempo'],
              ['format-list-numbered', String(routine.items.length), 'Ejercicios'],
              ['fire', String(Math.round((elapsed.current / 60) * 9)), 'kcal aprox.'],
            ].map(([ic, v, l]) => (
              <View key={l} style={{ alignItems: 'center', backgroundColor: theme.card, borderRadius: 20, paddingVertical: 16, marginHorizontal: 5, flex: 1, borderWidth: 1, borderColor: theme.border }}>
                <Icon name={ic as any} size={22} color={theme.primary} />
                <Text style={{ color: theme.text, fontWeight: '900', fontSize: 20, marginTop: 6 }}>{v}</Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>{l}</Text>
              </View>
            ))}
          </View>
          <Button
            label="Ver mi progreso"
            icon="trophy-outline"
            onPress={() => {
              setAgentStatus(null);
              router.replace('/progreso');
            }}
            style={{ marginTop: 24, alignSelf: 'stretch' }}
          />
          <Button label="Volver al inicio" icon="home" variant="ghost" onPress={exit} style={{ marginTop: 10, alignSelf: 'stretch' }} />
        </ScrollView>
      </View>
    );
  }

  // ---------- Entrenamiento en curso ----------
  const SIZE = 264;
  const r = 112;
  const c = 2 * Math.PI * r;
  const progress = step.phase === 'set' ? 1 : step.sec ? Math.max(0, remaining) / step.sec : 0;
  const workSteps = steps.filter((s) => s.phase === 'work' || s.phase === 'set');
  const workDone = steps.slice(0, idx).filter((s) => s.phase === 'work' || s.phase === 'set').length;
  const showEx = step.phase === 'rest' && nextItem ? nextItem : item;
  const upcoming = routine.items.slice(Math.min(routine.items.length, (nextWork?.ex ?? step.ex) + (step.phase === 'rest' ? 1 : 1)));
  const urgent = step.phase !== 'set' && remaining <= 3;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={[color + '40', color + '10', theme.bg]} locations={[0, 0.45, 0.8]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={exit} style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: theme.card + 'CC', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={22} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontWeight: '800' }} numberOfLines={1}>
              {routine.title}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Ejercicio {step.ex + 1} de {routine.items.length}
            </Text>
          </View>
          {/* XP acumulado en la sesión + "+N XP" flotante al completar */}
          <View style={{ minWidth: 42, alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card + 'CC', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }}>
              <Icon name="lightning-bolt" size={14} color={theme.accent} />
              <Text style={{ color: theme.text, fontWeight: '900', fontSize: 12, marginLeft: 2 }}>{liveXp}</Text>
            </View>
            <Animated.Text
              style={{
                position: 'absolute',
                top: 30,
                right: 0,
                color: theme.accent,
                fontWeight: '900',
                fontSize: 14,
                opacity: xpPop.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateY: xpPop.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
              }}
            >
              +{lastGain} XP
            </Animated.Text>
          </View>
        </View>

        {/* Progreso segmentado por ejercicio */}
        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          {routine.items.map((_, i) => {
            const fill = i < step.ex ? 1 : i === step.ex ? (step.round + (step.phase === 'rest' ? 1 : 0)) / item.rounds : 0;
            return (
              <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: theme.card, marginHorizontal: 2, overflow: 'hidden' }}>
                <View style={{ width: `${fill * 100}%`, height: 5, backgroundColor: color }} />
              </View>
            );
          })}
        </View>

        {/* Fase + anillo */}
        <Animated.View style={{ alignItems: 'center', marginTop: 22, transform: [{ scale: pulse }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '26', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Icon name={PHASE_ICON[step.phase] as any} size={16} color={color} />
            <Text style={{ color, fontWeight: '900', letterSpacing: 2, fontSize: 13, marginLeft: 6 }}>{PHASE[step.phase]}</Text>
          </View>
          <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
            <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
              <Defs>
                <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={color} />
                  <Stop offset="1" stopColor={shade(color, 0.7)} />
                </SvgGradient>
              </Defs>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={r} stroke={theme.card} strokeWidth={16} fill="none" />
              {/* brillo */}
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                stroke={color}
                strokeOpacity={0.18}
                strokeWidth={30}
                fill="none"
                strokeDasharray={`${c} ${c}`}
                strokeDashoffset={c * (1 - progress)}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={r}
                stroke="url(#ring)"
                strokeWidth={16}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${c} ${c}`}
                strokeDashoffset={c * (1 - progress)}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            </Svg>
            {step.phase === 'set' ? (
              <>
                <Text style={{ color: theme.text, fontSize: 76, fontWeight: '900', letterSpacing: -2 }}>{item.reps}</Text>
                <Text style={{ color: theme.muted, fontWeight: '800', letterSpacing: 1 }}>REPETICIONES</Text>
              </>
            ) : (
              <Text style={{ color: urgent ? color : theme.text, fontSize: 72, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{fmtTime(Math.max(0, remaining))}</Text>
            )}
            {/* Rondas */}
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              {Array.from({ length: item.rounds }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: i === step.round ? 18 : 8,
                    height: 8,
                    borderRadius: 4,
                    marginHorizontal: 3,
                    backgroundColor: i < step.round || (i === step.round && step.phase === 'rest') ? color : i === step.round ? color : theme.border,
                    opacity: i < step.round ? 0.5 : 1,
                  }}
                />
              ))}
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>
              {strength ? 'Serie' : 'Ronda'} {step.round + 1} de {item.rounds}
            </Text>
          </View>
        </Animated.View>

        {/* Ejercicio actual / siguiente */}
        <View style={{ backgroundColor: theme.card, borderRadius: 24, padding: 16, marginTop: 18, borderWidth: 1, borderColor: color + '55' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <LinearGradient colors={[color, shade(color, 0.7)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Icon name={showEx.exercise.icon as any} size={30} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: color + '26', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 3 }}>
                <Text style={{ color, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{step.phase === 'rest' ? 'SIGUIENTE' : 'AHORA'}</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 }}>{showEx.exercise.name}</Text>
            </View>
          </View>
          <Text style={{ color: theme.muted, fontSize: 13, marginTop: 10, lineHeight: 18 }}>{showEx.exercise.desc}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {showEx.exercise.muscles.map((m) => (
              <View key={m} style={{ backgroundColor: theme.cardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginTop: 4 }}>
                <Text style={{ color: theme.text, fontSize: 11, fontWeight: '600' }}>{MUSCLES[m].name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Controles */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 }}>
          <Ctrl icon="skip-previous" onPress={() => goTo(Math.max(0, idx - 1))} />
          <Pressable
            onPress={() => (step.phase === 'set' ? (markDone(idx), goTo(idx + 1)) : setPaused(!paused))}
            style={({ pressed }) => ({ marginHorizontal: 20, transform: [{ scale: pressed ? 0.94 : 1 }], shadowColor: color, shadowOpacity: 0.5, shadowRadius: 18, elevation: 8, borderRadius: 40 })}
          >
            <LinearGradient
              colors={[color, shade(color, 0.7)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ height: 80, minWidth: 80, paddingHorizontal: step.phase === 'set' ? 26 : 0, borderRadius: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
            >
              <Icon name={step.phase === 'set' ? 'check-bold' : paused ? 'play' : 'pause'} size={step.phase === 'set' ? 26 : 38} color="#fff" />
              {step.phase === 'set' && <Text style={{ color: '#fff', fontWeight: '900', marginLeft: 8, fontSize: 15 }}>Serie lista</Text>}
            </LinearGradient>
          </Pressable>
          <Ctrl icon="skip-next" onPress={() => goTo(idx + 1)} />
        </View>
        {step.phase === 'rest' || step.phase === 'prep' ? (
          <Pressable onPress={() => setRemaining((x) => x + 15)} style={{ alignSelf: 'center', marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Icon name="plus" size={16} color={theme.primary} />
            <Text style={{ color: theme.primary, fontWeight: '800', marginLeft: 4 }}>15 s de descanso</Text>
          </Pressable>
        ) : null}

        {/* Lo que viene */}
        {upcoming.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>DESPUÉS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {upcoming.map((u, i) => (
                <View key={i} style={{ backgroundColor: theme.card, borderRadius: 16, padding: 10, marginRight: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                  <Icon name={u.exercise.icon as any} size={18} color={theme.muted} />
                  <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>{u.exercise.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );

  function Ctrl({ icon, onPress }: { icon: string; onPress: () => void }) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ width: 54, height: 54, borderRadius: 27, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.7 : 1 })}>
        <Icon name={icon as any} size={26} color={theme.text} />
      </Pressable>
    );
  }
}
