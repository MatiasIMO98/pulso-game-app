import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { generateRoutine, swapExercise } from '../agent/agent';
import { Button, Card, fmtTime, Icon, Screen } from '../components/ui';
import { typeInfo } from '../data/exercises';
import { MUSCLES } from '../data/muscles';
import { useApp } from '../store';

export default function Rutina() {
  const { theme, routine, setRoutine, settings, say } = useApp();
  const router = useRouter();
  if (!routine) {
    return (
      <Screen title="Rutina">
        <Text style={{ color: theme.muted }}>No hay rutina generada.</Text>
      </Screen>
    );
  }
  const info = typeInfo(routine.type);
  const strength = routine.type === 'fuerza';

  return (
    <Screen
      title={routine.title}
      subtitle={`${routine.items.length} ejercicios · ~${Math.round(routine.totalSeconds / 60)} min`}
      right={
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={22} color={theme.text} />
        </Pressable>
      }
    >
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        <Tag icon={info.icon} text={info.name} color={info.color} />
        <Tag icon="timer-sand" text={strength ? `Descanso ${routine.items[0]?.rest}s` : `${routine.items[0]?.work}s / ${routine.items[0]?.rest}s`} color={theme.muted} />
        <Tag icon="repeat" text={strength ? `${routine.options.rounds}×${routine.options.reps}` : `${routine.options.rounds} rondas`} color={theme.muted} />
      </View>

      {routine.items.map((it, i) => (
        <Card key={it.exercise.id + i} style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Icon name={it.exercise.icon as any} size={24} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>
              {i + 1}. {it.exercise.name}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
              {it.exercise.muscles.map((m) => MUSCLES[m].name).join(', ')}
            </Text>
            <Text style={{ color: theme.text, fontSize: 12, marginTop: 3, fontWeight: '600' }}>
              {strength ? `${it.rounds} series × ${it.reps} reps` : `${it.rounds} × ${it.work}s · descanso ${it.rest}s`}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setRoutine(swapExercise(routine, i));
              say('Cambiado por otro que trabaja lo mismo.', { priority: 'low' });
            }}
            hitSlop={10}
            style={{ padding: 6 }}
          >
            <Icon name="swap-horizontal" size={22} color={theme.muted} />
          </Pressable>
        </Card>
      ))}

      <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginBottom: 14 }}>Duración total estimada: {fmtTime(routine.totalSeconds)}</Text>

      <Button label="Comenzar entrenamiento" icon="play" onPress={() => router.replace('/sesion')} style={{ backgroundColor: info.color }} />
      <Button
        label="Generar otra versión"
        icon="refresh"
        variant="ghost"
        style={{ marginTop: 10 }}
        onPress={() => {
          setRoutine(generateRoutine(routine.options, settings.agentLevel));
          say('Aquí tienes una variante nueva.', { priority: 'normal' });
        }}
      />
    </Screen>
  );

  function Tag({ icon, text, color }: { icon: string; text: string; color: string }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: theme.border }}>
        <Icon name={icon as any} size={14} color={color} />
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginLeft: 5 }}>{text}</Text>
      </View>
    );
  }
}
