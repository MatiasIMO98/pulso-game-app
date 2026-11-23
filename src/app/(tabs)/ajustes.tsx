import React from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { AGENT_LEVELS, phrase, type AgentLevel } from '../../agent/agent';
import { AgentFace } from '../../components/AgentDock';
import { Button, Card, Divider, Icon, Row, Screen, SectionTitle, Segmented, Toggle } from '../../components/ui';
import { useApp } from '../../store';
import { THEMES } from '../../theme';

export default function Ajustes() {
  const { theme, settings: s, updateSettings: set, user, logout, say, mode, syncError } = useApp();

  return (
    <Screen title="Ajustes">
      {/* Cuenta */}
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={{ width: 54, height: 54, borderRadius: 18, marginRight: 12 }} />
        ) : (
          <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ color: theme.onPrimary, fontSize: 22, fontWeight: '900' }}>{user?.name[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 17 }}>{user?.name}</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{user?.email}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
            <Icon
              name={mode === 'demo' ? 'cloud-off-outline' : syncError ? 'cloud-alert' : 'cloud-check-outline'}
              size={14}
              color={mode === 'demo' ? theme.accent : syncError ? theme.danger : theme.success}
            />
            <Text style={{ color: mode === 'demo' ? theme.accent : syncError ? theme.danger : theme.success, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
              {mode === 'demo' ? 'Modo demo · los datos no se guardan' : syncError ? 'Error de sincronización' : 'Cuenta de Google · sincronizado'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Agente */}
      <Card>
        <SectionTitle>Agente</SectionTitle>
        <Row label="Activar agente" hint="Acompañamiento en pantalla" icon="robot-happy-outline">
          <Toggle value={s.agentEnabled} onChange={(v) => set({ agentEnabled: v })} />
        </Row>
        <Row label="Nombre" icon="rename-box">
          <TextInput
            value={s.agentName}
            onChangeText={(t) => set({ agentName: t || 'Nova' })}
            style={{ color: theme.text, backgroundColor: theme.cardAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 100, textAlign: 'right' }}
          />
        </Row>
        <Divider />
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15, marginTop: 10 }}>Intensidad del agente</Text>
        <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 10 }}>Controla cuánto habla y su tono</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {AGENT_LEVELS.map((l) => {
            const a = l.level === s.agentLevel;
            return (
              <Pressable
                key={l.level}
                onPress={() => {
                  set({ agentLevel: l.level });
                  setTimeout(() => say(phrase('mid', l.level as AgentLevel), { priority: 'high', mood: l.level >= 4 ? 'hype' : 'happy' }), 50);
                }}
                style={{ alignItems: 'center', flex: 1 }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: a ? theme.primary : theme.cardAlt,
                    borderWidth: 1,
                    borderColor: a ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ color: a ? theme.onPrimary : theme.text, fontWeight: '900', fontSize: 16 }}>{l.level}</Text>
                </View>
                <Text style={{ color: a ? theme.primary : theme.muted, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{l.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 6, borderRadius: 3, marginTop: 10, backgroundColor: theme.cardAlt }}>
          <View style={{ height: 6, borderRadius: 3, width: `${s.agentLevel * 20}%`, backgroundColor: theme.primary }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primarySoft, borderRadius: 14, padding: 10, marginTop: 12 }}>
          <AgentFace mood={s.agentLevel >= 4 ? 'hype' : s.agentLevel <= 2 ? 'calm' : 'happy'} size={34} color={theme.primary} bg={theme.card} />
          <Text style={{ color: theme.text, marginLeft: 10, flex: 1, fontSize: 13 }}>
            <Text style={{ fontWeight: '800' }}>{AGENT_LEVELS[s.agentLevel - 1].name}: </Text>
            {AGENT_LEVELS[s.agentLevel - 1].desc}
          </Text>
        </View>
        <Row label="Posición en pantalla" icon="dock-right">
          <View style={{ width: 150 }}>
            <Segmented value={s.agentSide} onChange={(v) => set({ agentSide: v })} options={[{ value: 'left', label: 'Izq.' }, { value: 'right', label: 'Der.' }]} />
          </View>
        </Row>
        <Row label="Mostrar durante el entrenamiento" hint="Cronómetro y avisos junto al avatar" icon="timer-outline">
          <Toggle value={s.agentInWorkout} onChange={(v) => set({ agentInWorkout: v })} />
        </Row>
        <Row label="Conexión IA" hint="Modo local simulado · Claude disponible próximamente" icon="creation">
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>LOCAL</Text>
        </Row>
      </Card>

      {/* Notificaciones */}
      <Card>
        <SectionTitle>Notificaciones</SectionTitle>
        <Row label="Recordatorios de entrenamiento" icon="bell-ring-outline">
          <Toggle value={s.notifReminders} onChange={(v) => set({ notifReminders: v })} />
        </Row>
        <Row label="Mensajes de motivación" icon="heart-outline">
          <Toggle value={s.notifMotivation} onChange={(v) => set({ notifMotivation: v })} />
        </Row>
        <Row label="Avisos de balance muscular" icon="scale-balance">
          <Toggle value={s.notifBalance} onChange={(v) => set({ notifBalance: v })} />
        </Row>
        <Row label="Horario silencioso" hint="Sin avisos de 22:00 a 07:00" icon="weather-night">
          <Toggle value={s.quietHours} onChange={(v) => set({ quietHours: v })} />
        </Row>
      </Card>

      {/* Tema */}
      <Card>
        <SectionTitle>Tema</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
          {Object.values(THEMES).map((t) => {
            const a = s.theme === t.id;
            return (
              <Pressable key={t.id} onPress={() => set({ theme: t.id })} style={{ width: '50%', padding: 4 }}>
                <View style={{ backgroundColor: t.bg, borderRadius: 16, padding: 12, borderWidth: 2, borderColor: a ? t.primary : t.border }}>
                  <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                    {[t.primary, t.accent, t.card].map((c) => (
                      <View key={c} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c, marginRight: 5, borderWidth: 1, borderColor: t.border }} />
                    ))}
                  </View>
                  <Text style={{ color: t.text, fontWeight: '800' }}>{t.name}</Text>
                  <Text style={{ color: t.muted, fontSize: 11 }}>{t.dark ? 'Oscuro' : 'Claro'}</Text>
                  {a && <Icon name="check-circle" size={18} color={t.primary} style={{ position: 'absolute', right: 10, top: 10 }} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Sonido */}
      <Card>
        <SectionTitle>Sonido y vibración</SectionTitle>
        <Row label="Efectos de sonido" icon="volume-high">
          <Toggle value={s.soundEffects} onChange={(v) => set({ soundEffects: v })} />
        </Row>
        <Row label="Voz del agente" hint="Lee en voz alta los avisos" icon="account-voice">
          <Toggle value={s.voice} onChange={(v) => set({ voice: v })} />
        </Row>
        <Row label="Cuenta atrás 3-2-1" icon="numeric-3-circle-outline">
          <Toggle value={s.countdownBeep} onChange={(v) => set({ countdownBeep: v })} />
        </Row>
        <Row label="Vibración" icon="vibrate">
          <Toggle value={s.vibration} onChange={(v) => set({ vibration: v })} />
        </Row>
        <Row label="Volumen" icon="tune-vertical">
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Pressable key={i} onPress={() => set({ volume: i })} hitSlop={4} style={{ width: 10, height: 8 + i * 5, borderRadius: 3, marginLeft: 4, backgroundColor: i <= s.volume ? theme.primary : theme.cardAlt }} />
            ))}
          </View>
        </Row>
      </Card>

      {/* General */}
      <Card>
        <SectionTitle>General</SectionTitle>
        <Row label="Unidades" icon="ruler">
          <View style={{ width: 150 }}>
            <Segmented value={s.units} onChange={(v) => set({ units: v })} options={[{ value: 'metric', label: 'cm/kg' }, { value: 'imperial', label: 'in/lb' }]} />
          </View>
        </Row>
        <Pressable onPress={() => set({ onboardingDone: false })}>
          <Row
            label="Repetir cuestionario inicial"
            hint={s.plan ? `Plan actual: ${s.plan.weeklyGoal} sesiones/semana · ${s.plan.minutes} min` : 'Crea un plan semanal con objetivos'}
            icon="clipboard-text-outline"
          >
            <Icon name="chevron-right" size={20} color={theme.muted} />
          </Row>
        </Pressable>
        <Row label="Privacidad y datos" icon="shield-lock-outline">
          <Icon name="chevron-right" size={20} color={theme.muted} />
        </Row>
        <Row label="Acerca de Pulso" hint="Prototipo v0.1" icon="information-outline">
          <Icon name="chevron-right" size={20} color={theme.muted} />
        </Row>
      </Card>

      <Button label={mode === 'demo' ? 'Salir del modo demo' : 'Cerrar sesión'} icon="logout" variant="ghost" onPress={() => void logout()} />
    </Screen>
  );
}
