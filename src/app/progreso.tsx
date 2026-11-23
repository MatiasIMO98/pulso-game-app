import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  challengeRoutine,
  challengeStatus,
  GROUP_TIERS,
  groupLevel,
  groupXpForLevel,
  MAX_GROUP_LEVEL,
  NOVA_STAGES,
  novaStage,
  refreshChallenge,
  titleFor,
  xpForLevel,
  type Progress,
} from '../agent/progress';
import { AgentFace } from '../components/AgentDock';
import { BodyMap } from '../components/BodyMap';
import { Button, Card, Icon, Screen, SectionTitle, shade } from '../components/ui';
import { EXERCISES } from '../data/exercises';
import { GROUPS, MUSCLES, type MuscleId } from '../data/muscles';
import { useApp } from '../store';

const KIND = {
  routine: { label: 'Completa esta rutina', icon: 'clipboard-play-outline' },
  exercises: { label: 'Realiza estos ejercicios', icon: 'format-list-checks' },
  requirement: { label: 'Cumple este requisito', icon: 'flag-checkered' },
} as const;

export default function Progreso() {
  const { theme, settings } = useApp();
  if (!settings.progress) {
    return (
      <Screen title="Tu progreso">
        <Text style={{ color: theme.muted }}>Preparando tu progreso…</Text>
      </Screen>
    );
  }
  return <ProgresoContent p={settings.progress} />;
}

function ProgresoContent({ p }: { p: Progress }) {
  const { theme, settings, updateSettings, history, measures, setRoutine, say } = useApp();
  const router = useRouter();

  const prev = xpForLevel(p.level);
  const next = xpForLevel(p.level + 1);
  const pct = Math.min(1, (p.xp - prev) / Math.max(1, next - prev));
  const xpReady = p.xp >= next;
  const ch = p.challenge;
  const status = challengeStatus(ch, {
    workouts: history,
    measureDates: Object.values(measures).flatMap((l) => l.map((e) => e.date)),
    groupXp: p.groupXp,
  });
  const chDone = ch.done || status.done;
  const stage = novaStage(p.level);

  // Si un requisito ya se cumplió (p. ej. por entrenamientos antiguos), confirmarlo y subir de nivel si toca
  useEffect(() => {
    if (ch.done || !status.done) return;
    updateSettings({
      progress: refreshChallenge(p, { workouts: history, measureDates: Object.values(measures).flatMap((l) => l.map((e) => e.date)), groupXp: p.groupXp }, { equipment: settings.plan?.equipment ?? [], exclude: settings.plan?.exclude ?? [] }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch.id, status.done]);

  const startChallenge = () => {
    if (ch.kind === 'requirement') {
      if (ch.requirement?.metric === 'measure') router.push('/medidas');
      else router.replace('/');
      return;
    }
    const r = challengeRoutine(
      ch,
      {
        equipment: settings.plan?.equipment ?? [],
        exclude: settings.plan?.exclude ?? [],
        level: settings.plan?.level ?? 2,
        intensity: settings.plan?.intensity ?? 2,
      },
      settings.agentLevel,
    );
    if (!r) return;
    setRoutine(r);
    router.push('/rutina');
    setTimeout(() => say('¡Rutina de reto lista! Complétala entera para superarlo.', { mood: 'hype', priority: 'high' }), 400);
  };

  // Mapa de calor por nivel de grupo
  const heat = Object.fromEntries(
    (Object.keys(MUSCLES) as MuscleId[]).map((m) => {
      const l = groupLevel(p.groupXp[MUSCLES[m].group]);
      return [m, l <= 1 && p.groupXp[MUSCLES[m].group] === 0 ? 0 : l / MAX_GROUP_LEVEL];
    }),
  );

  return (
    <Screen
      title="Tu progreso"
      subtitle="Sube de nivel entrenando"
      right={
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} color={theme.text} />
        </Pressable>
      }
    >
      {/* Nivel del atleta */}
      <LinearGradient colors={[theme.primary, theme.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: 18, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>NIVEL</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginTop: -4 }}>{p.level}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{titleFor(p.level)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12 }}>
              {p.xp.toLocaleString('es')} XP en total · {p.completed.length} retos superados
            </Text>
          </View>
        </View>
        <View style={{ height: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, marginTop: 16, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: 10, backgroundColor: '#fff', borderRadius: 5 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' }}>
            {Math.max(0, p.xp - prev)} / {next - prev} XP
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' }}>Nivel {p.level + 1}</Text>
        </View>
      </LinearGradient>

      {/* Requisitos para subir */}
      <Card>
        <SectionTitle>Para subir al nivel {p.level + 1}</SectionTitle>
        {[
          { ok: xpReady, text: xpReady ? 'XP suficiente' : `Consigue ${next - p.xp} XP más`, icon: 'lightning-bolt' },
          { ok: chDone, text: chDone ? 'Reto superado' : 'Supera el reto del nivel', icon: 'sword-cross' },
        ].map((r) => (
          <View key={r.icon} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
            <Icon name={r.ok ? 'check-circle' : 'circle-outline'} size={22} color={r.ok ? theme.success : theme.border} />
            <Icon name={r.icon as any} size={16} color={theme.muted} style={{ marginLeft: 10 }} />
            <Text style={{ color: r.ok ? theme.text : theme.muted, marginLeft: 6, fontWeight: '600' }}>{r.text}</Text>
          </View>
        ))}

        {/* Reto */}
        <View style={{ backgroundColor: theme.cardAlt, borderRadius: 18, padding: 14, marginTop: 10, borderWidth: 1, borderColor: chDone ? theme.success : theme.accent + '88' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name={KIND[ch.kind].icon as any} size={18} color={chDone ? theme.success : theme.accent} />
            <Text style={{ color: chDone ? theme.success : theme.accent, fontWeight: '900', fontSize: 11, letterSpacing: 0.8, marginLeft: 6 }}>
              {chDone ? 'RETO SUPERADO' : `RETO · ${KIND[ch.kind].label.toUpperCase()}`}
            </Text>
          </View>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800', marginTop: 6 }}>{ch.title}</Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2, lineHeight: 17 }}>{ch.desc}</Text>

          {ch.kind === 'exercises' && ch.exercises ? (
            <View style={{ marginTop: 10 }}>
              {ch.exercises.map((n) => {
                const ex = EXERCISES.find((e) => e.name === n);
                return (
                  <View key={n} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                    <Icon name={(ex?.icon ?? 'dumbbell') as any} size={18} color={theme.primary} />
                    <Text style={{ color: theme.text, marginLeft: 8, fontWeight: '600' }}>{n}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {ch.kind === 'requirement' && ch.requirement?.metric !== 'noSkip' && !chDone ? (
            <View style={{ marginTop: 10 }}>
              <View style={{ height: 8, backgroundColor: theme.card, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${(status.value / status.target) * 100}%`, height: 8, backgroundColor: theme.accent }} />
              </View>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
                {status.value} / {status.target}
              </Text>
            </View>
          ) : null}

          {!chDone ? (
            <Button
              label={ch.kind === 'routine' ? 'Hacer la rutina de reto' : ch.kind === 'exercises' ? 'Crear rutina con estos ejercicios' : ch.requirement?.metric === 'measure' ? 'Registrar medidas' : 'Ir a entrenar'}
              icon={ch.kind === 'requirement' ? 'arrow-right' : 'play'}
              colors={[theme.accent, shade(theme.accent)]}
              onPress={startChallenge}
              style={{ marginTop: 12 }}
            />
          ) : null}
        </View>
      </Card>

      {/* Cuerpo por niveles */}
      <Card>
        <SectionTitle>Nivel por grupo muscular</SectionTitle>
        <BodyMap mode="heat" heat={heat} width={280} showLabel={false} />
        <View style={{ marginTop: 12 }}>
          {[...GROUPS]
            .sort((a, b) => p.groupXp[b.id] - p.groupXp[a.id])
            .map((g) => {
              const xp = p.groupXp[g.id];
              const l = groupLevel(xp);
              const lo = groupXpForLevel(l);
              const hi = groupXpForLevel(l + 1);
              const gp = l >= MAX_GROUP_LEVEL ? 1 : (xp - lo) / (hi - lo);
              return (
                <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: theme.primary + Math.round(30 + (l / MAX_GROUP_LEVEL) * 200).toString(16).padStart(2, '0'), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '900' }}>{l}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: theme.text, fontWeight: '700' }}>
                        {g.name} <Text style={{ color: theme.muted, fontWeight: '500', fontSize: 12 }}>· {GROUP_TIERS[l - 1]}</Text>
                      </Text>
                      <Text style={{ color: theme.muted, fontSize: 11 }}>{l >= MAX_GROUP_LEVEL ? 'Máx.' : `${Math.round(xp)} / ${hi}`}</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: theme.cardAlt, borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                      <View style={{ width: `${gp * 100}%`, height: 6, backgroundColor: theme.primary }} />
                    </View>
                  </View>
                </View>
              );
            })}
        </View>
      </Card>

      {/* Evolución de Nova */}
      <Card>
        <SectionTitle>Evolución de {settings.agentName}</SectionTitle>
        <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 12 }}>{settings.agentName} evoluciona contigo al alcanzar ciertos niveles.</Text>
        {NOVA_STAGES.map((s, i) => {
          const unlocked = i <= stage;
          return (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, opacity: unlocked ? 1 : 0.5 }}>
              <AgentFace mood={unlocked ? 'happy' : 'calm'} size={46} color={unlocked ? theme.primary : theme.muted} color2={unlocked ? theme.primary2 : theme.muted} bg={theme.card} stage={i} animated={false} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {s.name} <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 12 }}>· Nivel {s.level}</Text>
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>{s.unlock}</Text>
              </View>
              <Icon name={unlocked ? (i === stage ? 'star-circle' : 'check-circle') : 'lock-outline'} size={22} color={unlocked ? (i === stage ? theme.accent : theme.success) : theme.muted} />
            </View>
          );
        })}
      </Card>

      {/* Cómo ganar XP */}
      <Card>
        <SectionTitle>Cómo ganar XP</SectionTitle>
        {[
          ['dumbbell', 'Cada intervalo o serie completada', 'Según duración o repeticiones × intensidad'],
          ['flag-checkered', 'Terminar el entrenamiento', '+25 XP (al menos el 80% hecho)'],
          ['calendar-check', 'Seguir tu plan semanal', '+15 XP'],
          ['fire', 'Entrenar días seguidos', '+10 XP'],
          ['sword-cross', 'Completar una rutina de reto', '+50 XP'],
        ].map(([ic, t, d]) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
            <Icon name={ic as any} size={18} color={theme.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{t}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>{d}</Text>
            </View>
          </View>
        ))}
        <Text style={{ color: theme.muted, fontSize: 11, marginTop: 6 }}>Los ejercicios saltados no dan XP. El XP de cada ejercicio también sube el nivel de los grupos que trabaja.</Text>
      </Card>

      {p.completed.length ? (
        <Card>
          <SectionTitle>Retos superados</SectionTitle>
          {[...p.completed].reverse().map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
              <View style={{ backgroundColor: theme.success + '22', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: theme.success, fontWeight: '900', fontSize: 11 }}>Nv {c.level + 1}</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 13, marginLeft: 10, flex: 1 }} numberOfLines={2}>
                {c.title}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
