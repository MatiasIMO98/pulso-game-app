import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { notificationSamples, phrase } from '../../agent/agent';
import { AgentFace } from '../../components/AgentDock';
import { Button, Card, Chip, Divider, Icon, Row, Screen, SectionTitle, Toggle } from '../../components/ui';
import { TRAINING_TYPES, typeInfo, type TrainingType } from '../../data/exercises';
import { ymd, useApp } from '../../store';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WD = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WD_JS = [1, 2, 3, 4, 5, 6, 0]; // L..D → getDay()
const TIMES = ['06:30', '07:00', '12:00', '18:00', '19:30', '21:00'];

export default function Calendario() {
  const { theme, events, history, addEvent, removeEvent, templates, addTemplate, applyTemplate, settings, say } = useApp();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [sel, setSel] = useState(ymd(new Date()));
  const [adding, setAdding] = useState(false);
  const [nType, setNType] = useState<TrainingType>('hiit');
  const [nTime, setNTime] = useState('18:00');
  const [nReminder, setNReminder] = useState(true);
  const [nRepeat, setNRepeat] = useState(false);
  const [newTpl, setNewTpl] = useState(false);
  const [tName, setTName] = useState<TrainingType>('fuerza');
  const [tDays, setTDays] = useState<number[]>([1, 3]);

  const cells = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const arr: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [cursor]);

  const todayStr = ymd(new Date());
  const dayEvents = events.filter((e) => e.date === sel).sort((a, b) => a.time.localeCompare(b.time));
  const dayDone = history.filter((h) => h.date === sel);
  const upcoming = events.filter((e) => e.date >= todayStr).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const reminderText = useMemo(
    () => (upcoming ? phrase('reminder', settings.agentLevel, { type: upcoming.title, time: upcoming.time }) : ''),
    [upcoming?.id, settings.agentLevel], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const save = () => {
    const base = new Date(sel + 'T12:00:00');
    const n = nRepeat ? 4 : 1;
    for (let i = 0; i < n; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i * 7);
      addEvent({ date: ymd(d), type: nType, time: nTime, title: typeInfo(nType).name, reminder: nReminder });
    }
    setAdding(false);
    say(nReminder ? `¡Agendado! Te avisaré antes de las ${nTime}.` : 'Agendado en tu calendario.', { priority: 'normal' });
  };

  return (
    <Screen title="Calendario" subtitle="Planifica y no pierdas el ritmo">
      {upcoming && (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primarySoft, borderRadius: 18, padding: 12, marginBottom: 14 }}>
          <AgentFace mood="happy" size={42} color={theme.primary} bg={theme.card} />
          <Text style={{ color: theme.text, flex: 1, marginLeft: 10, fontSize: 13, lineHeight: 18 }}>
            {reminderText}
            {upcoming.date !== todayStr ? ` (${upcoming.date.slice(8)}/${upcoming.date.slice(5, 7)})` : ''}
          </Text>
        </View>
      )}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} hitSlop={10}>
            <Icon name="chevron-left" size={26} color={theme.text} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', color: theme.text, fontWeight: '800', fontSize: 17 }}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </Text>
          <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} hitSlop={10}>
            <Icon name="chevron-right" size={26} color={theme.text} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WD.map((w) => (
            <Text key={w} style={{ flex: 1, textAlign: 'center', color: theme.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
              {w}
            </Text>
          ))}
        </View>
        {/* Filas explícitas de 7 días: con porcentajes + flexWrap, Android redondea y el domingo saltaba de línea */}
        {Array.from({ length: cells.length / 7 }, (_, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {cells.slice(w * 7, w * 7 + 7).map((d, j) => {
            const i = w * 7 + j;
            if (!d) return <View key={i} style={{ flex: 1, height: 50 }} />;
            const k = ymd(d);
            const ev = events.filter((e) => e.date === k);
            const doneHere = history.some((h) => h.date === k);
            const isSel = k === sel;
            const isToday = k === todayStr;
            return (
              <Pressable key={i} onPress={() => setSel(k)} style={{ flex: 1, height: 50, alignItems: 'center', paddingTop: 4 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSel ? theme.primary : doneHere ? theme.primarySoft : 'transparent',
                    borderWidth: isToday && !isSel ? 1.5 : 0,
                    borderColor: theme.primary,
                  }}
                >
                  <Text style={{ color: isSel ? theme.onPrimary : theme.text, fontWeight: isToday ? '800' : '500' }}>{d.getDate()}</Text>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 3, height: 5 }}>
                  {ev.slice(0, 3).map((e) => (
                    <View key={e.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: typeInfo(e.type).color, marginHorizontal: 1 }} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          {TRAINING_TYPES.map((t) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, marginTop: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.color, marginRight: 4 }} />
              <Text style={{ color: theme.muted, fontSize: 11 }}>{t.name}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: theme.primarySoft, marginRight: 4 }} />
            <Text style={{ color: theme.muted, fontSize: 11 }}>Completado</Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle right={!adding ? <Text onPress={() => setAdding(true)} style={{ color: theme.primary, fontWeight: '700' }}>+ Añadir</Text> : null}>
          {new Date(sel + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </SectionTitle>
        {dayDone.map((h) => (
          <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <Icon name="check-circle" size={20} color={theme.success} />
            <Text style={{ color: theme.text, marginLeft: 10, flex: 1 }}>
              {typeInfo(h.type).name} completado · {h.minutes} min
            </Text>
          </View>
        ))}
        {dayEvents.map((e) => (
          <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <View style={{ width: 4, height: 34, borderRadius: 2, backgroundColor: typeInfo(e.type).color, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{e.title}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {e.time} · {typeInfo(e.type).name}
                {e.reminder ? ' · 🔔 recordatorio' : ''}
              </Text>
            </View>
            <Pressable onPress={() => removeEvent(e.id)} hitSlop={10}>
              <Icon name="trash-can-outline" size={20} color={theme.muted} />
            </Pressable>
          </View>
        ))}
        {!dayEvents.length && !dayDone.length && !adding && <Text style={{ color: theme.muted }}>Día libre. ¿Agendamos algo?</Text>}

        {adding && (
          <View style={{ marginTop: 8 }}>
            <Divider />
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700', marginVertical: 8 }}>TIPO</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {TRAINING_TYPES.map((t) => (
                <Chip key={t.id} label={t.name} icon={t.icon} color={t.color} active={nType === t.id} onPress={() => setNType(t.id)} />
              ))}
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700', marginVertical: 8 }}>HORA</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {TIMES.map((t) => (
                <Chip key={t} label={t} active={nTime === t} onPress={() => setNTime(t)} />
              ))}
            </View>
            <Row label="Recordatorio" hint={`${settings.agentName} te avisará 30 min antes`} icon="bell-ring-outline">
              <Toggle value={nReminder} onChange={setNReminder} />
            </Row>
            <Row label="Repetir semanalmente" hint="Próximas 4 semanas" icon="repeat">
              <Toggle value={nRepeat} onChange={setNRepeat} />
            </Row>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <Button label="Cancelar" variant="ghost" onPress={() => setAdding(false)} style={{ flex: 1, marginRight: 8 }} />
              <Button label="Guardar" onPress={save} style={{ flex: 1 }} />
            </View>
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle right={<Text onPress={() => setNewTpl(!newTpl)} style={{ color: theme.primary, fontWeight: '700' }}>{newTpl ? 'Cerrar' : '+ Nueva'}</Text>}>
          Mis rutinas semanales
        </SectionTitle>
        {templates.map((t) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: typeInfo(t.type).color, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <Icon name={typeInfo(t.type).icon as any} size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>{t.name}</Text>
              <Text style={{ color: theme.muted, fontSize: 12 }}>
                {WD_JS.map((d, i) => (t.weekdays.includes(d) ? WD[i] : null)).filter(Boolean).join(' · ')} · {t.time}
              </Text>
            </View>
            <Chip
              label="Aplicar"
              icon="calendar-plus"
              onPress={() => {
                const n = applyTemplate(t.id, 4);
                say(`Marqué ${n} sesiones de "${t.name}" en las próximas 4 semanas.`, { priority: 'high' });
              }}
            />
          </View>
        ))}
        {newTpl && (
          <View style={{ marginTop: 6 }}>
            <Divider />
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700', marginVertical: 8 }}>TIPO</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {TRAINING_TYPES.map((t) => (
                <Chip key={t.id} label={t.name} color={t.color} active={tName === t.id} onPress={() => setTName(t.id)} />
              ))}
            </View>
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700', marginVertical: 8 }}>DÍAS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {WD.map((w, i) => (
                <Chip key={w} label={w} active={tDays.includes(WD_JS[i])} onPress={() => setTDays(tDays.includes(WD_JS[i]) ? tDays.filter((x) => x !== WD_JS[i]) : [...tDays, WD_JS[i]])} />
              ))}
            </View>
            <Button
              label="Crear rutina"
              onPress={() => {
                addTemplate({ name: `${typeInfo(tName).name} personalizada`, type: tName, weekdays: tDays, time: '18:00' });
                setNewTpl(false);
              }}
              style={{ marginTop: 6 }}
            />
          </View>
        )}
      </Card>

      <Card>
        <SectionTitle>Notificaciones de {settings.agentName}</SectionTitle>
        {notificationSamples(settings.agentLevel, settings.agentName).map((n, i) => (
          <View key={i} style={{ flexDirection: 'row', backgroundColor: theme.cardAlt, borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <Icon name={['bell-outline', 'heart-outline', 'scale-balance'][i] as any} size={20} color={theme.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>{n.title}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{n.body}</Text>
            </View>
          </View>
        ))}
        <Text style={{ color: theme.muted, fontSize: 11 }}>Vista previa · el tono cambia según la intensidad del agente en Ajustes.</Text>
      </Card>
    </Screen>
  );
}
