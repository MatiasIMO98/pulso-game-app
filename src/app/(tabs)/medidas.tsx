import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { measurementComment } from '../../agent/agent';
import { AgentFace } from '../../components/AgentDock';
import { BodyMap } from '../../components/BodyMap';
import { Button, Card, Chip, Icon, Screen, SectionTitle } from '../../components/ui';
import type { MuscleId } from '../../data/muscles';
import { MEASURES, useApp, type MeasureKey } from '../../store';

const MUSCLE_TO_MEASURE: Partial<Record<MuscleId, MeasureKey>> = {
  pectorales: 'pecho',
  deltoides: 'hombros',
  biceps: 'biceps',
  antebrazos: 'antebrazo',
  abdominales: 'abdomen',
  oblicuos: 'abdomen',
  cuadriceps: 'muslo',
  tibiales: 'pantorrilla',
};
const MEASURE_TO_MUSCLES: Partial<Record<MeasureKey, MuscleId[]>> = {
  pecho: ['pectorales'],
  hombros: ['deltoides'],
  biceps: ['biceps'],
  antebrazo: ['antebrazos'],
  abdomen: ['abdominales', 'oblicuos'],
  muslo: ['cuadriceps'],
  pantorrilla: ['tibiales'],
};

function Chart({ values, color, grid, muted }: { values: number[]; color: string; grid: string; muted: string }) {
  const W = 300;
  const H = 110;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [16 + (i * (W - 32)) / Math.max(1, values.length - 1), 12 + (1 - (v - min) / span) * (H - 34)]);
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.5, 1].map((f) => (
        <Line key={f} x1={0} x2={W} y1={12 + f * (H - 34)} y2={12 + f * (H - 34)} stroke={grid} strokeWidth={1} />
      ))}
      <Polyline points={pts.map((p) => p.join(',')).join(' ')} stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <React.Fragment key={i}>
          <Circle cx={x} cy={y} r={i === pts.length - 1 ? 5 : 3.5} fill={color} />
          <SvgText x={x} y={H - 4} fontSize={10} fill={muted} textAnchor="middle">
            {values[i]}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}

export default function Medidas() {
  const { theme, measures, addMeasure, settings, say } = useApp();
  const [key, setKey] = useState<MeasureKey>('pecho');
  const [input, setInput] = useState('');
  const meta = MEASURES.find((m) => m.key === key)!;
  const list = measures[key];
  const last = (k: MeasureKey) => measures[k].at(-1)?.value;
  const current = list.at(-1)?.value;
  const delta = list.length >= 2 ? +(list[list.length - 1].value - list[0].value).toFixed(1) : 0;
  const weight = last('peso');
  const height = last('altura');
  const bmi = weight && height ? weight / (height / 100) ** 2 : undefined;

  const comment = useMemo(
    () =>
      list.length === 0
        ? `Registra tu primera medida de ${meta.label.toLowerCase()}. ¡Así podremos ver cuánto avanzas!`
        : list.length === 1
          ? '¡Primer registro guardado! Con el siguiente ya veremos tu progreso.'
          : measurementComment(meta.label, delta, meta.unit, meta.goodWhenDown, settings.agentLevel),
    [meta, delta, list.length, settings.agentLevel],
  );

  const highlights = useMemo(() => {
    return MEASURES.filter((m) => m.key !== 'altura' && measures[m.key].length >= 2)
      .map((m) => {
        const l = measures[m.key];
        const d = l[l.length - 1].value - l[0].value;
        return { ...m, d, good: m.goodWhenDown ? d < 0 : d > 0 };
      })
      .filter((m) => m.good)
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 3);
  }, [measures]);

  const register = () => {
    const v = parseFloat(input.replace(',', '.'));
    if (isNaN(v)) return;
    addMeasure(key, v);
    setInput('');
    const text =
      current === undefined
        ? `¡Primer registro de ${meta.label.toLowerCase()}! Este es tu punto de partida.`
        : measurementComment(meta.label, +(v - current).toFixed(1), meta.unit, meta.goodWhenDown, settings.agentLevel);
    say(text, { mood: 'happy', priority: 'high' });
  };

  return (
    <Screen title="Medidas" subtitle="Tu progreso, en números">
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        {[
          ['scale-bathroom', weight !== undefined ? `${weight}` : '—', 'kg', 'Peso', 'peso'],
          ['human-male-height', height !== undefined ? `${height}` : '—', 'cm', 'Altura', 'altura'],
          ['heart-pulse', bmi ? bmi.toFixed(1) : '—', '', 'IMC', null],
        ].map(([ic, v, u, l, k]) => (
          <Pressable key={l} onPress={() => k && setKey(k as MeasureKey)} style={{ flex: 1, backgroundColor: key === k ? theme.primarySoft : theme.card, borderRadius: 18, padding: 12, marginRight: l !== 'IMC' ? 8 : 0, borderWidth: 1, borderColor: key === k ? theme.primary : theme.border }}>
            <Icon name={ic as any} size={20} color={theme.primary} />
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 20, marginTop: 6 }}>
              {v}
              <Text style={{ fontSize: 12, color: theme.muted }}> {u}</Text>
            </Text>
            <Text style={{ color: theme.muted, fontSize: 11 }}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <SectionTitle>Selecciona una zona</SectionTitle>
        <View style={{ flexDirection: 'row' }}>
          <BodyMap
            frontOnly
            selected={MEASURE_TO_MUSCLES[key] ?? []}
            onPress={(m) => MUSCLE_TO_MEASURE[m] && setKey(MUSCLE_TO_MEASURE[m]!)}
            width={140}
            showLabel={false}
          />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', paddingLeft: 8 }}>
            {MEASURES.map((m) => (
              <Chip key={m.key} label={m.label} active={key === m.key} onPress={() => setKey(m.key)} />
            ))}
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>{meta.label.toUpperCase()}</Text>
            <Text style={{ color: theme.text, fontSize: 34, fontWeight: '900' }}>
              {current ?? '—'}
              <Text style={{ fontSize: 16, color: theme.muted }}> {meta.unit}</Text>
            </Text>
          </View>
          {delta !== 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Icon name={delta > 0 ? 'trending-up' : 'trending-down'} size={16} color={(meta.goodWhenDown ? delta < 0 : delta > 0) ? theme.success : theme.accent} />
              <Text style={{ color: theme.text, fontWeight: '700', marginLeft: 4 }}>
                {delta > 0 ? '+' : ''}
                {delta} {meta.unit}
              </Text>
            </View>
          )}
        </View>
        {list.length >= 2 ? (
          <>
            <Chart values={list.slice(-8).map((l) => l.value)} color={theme.primary} grid={theme.border} muted={theme.muted} />
            <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center', marginBottom: 10 }}>Últimos {Math.min(8, list.length)} registros</Text>
          </>
        ) : (
          <View style={{ height: 90, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
            <Icon name="chart-line" size={24} color={theme.muted} />
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>El gráfico aparece con 2 registros o más</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Nueva medida (${meta.unit})`}
            placeholderTextColor={theme.muted}
            keyboardType="decimal-pad"
            style={{ flex: 1, backgroundColor: theme.cardAlt, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: theme.text, marginRight: 8 }}
          />
          <Button label="Registrar" icon="plus" onPress={register} />
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: theme.primarySoft, borderRadius: 16, padding: 12, marginTop: 12, alignItems: 'center' }}>
          <AgentFace mood="happy" size={38} color={theme.primary} bg={theme.card} />
          <Text style={{ color: theme.text, flex: 1, marginLeft: 10, fontSize: 13, lineHeight: 18 }}>{comment}</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle>Tus mejores avances</SectionTitle>
        {highlights.length === 0 && <Text style={{ color: theme.muted, fontSize: 13 }}>Registra varias medidas y aquí verás tus mayores avances.</Text>}
        {highlights.map((h) => (
          <View key={h.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7 }}>
            <Icon name="trophy-outline" size={20} color={theme.accent} />
            <Text style={{ color: theme.text, flex: 1, marginLeft: 10 }}>{h.label}</Text>
            <Text style={{ color: theme.success, fontWeight: '800' }}>
              {h.d > 0 ? '+' : ''}
              {h.d.toFixed(1)} {h.unit}
            </Text>
          </View>
        ))}
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>
          {settings.agentName}: “Cada centímetro cuenta una historia de constancia. ¡Sigue así!”
        </Text>
      </Card>
    </Screen>
  );
}
