import React, { useId, useState } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { GROUPS, MUSCLES, type MuscleId } from '../data/muscles';
import { useApp } from '../store';

/**
 * Cuerpo anatómico simplificado. Cada figura ocupa un lienzo de 200×420.
 * Las formas se dibujan para el lado izquierdo (del espectador) y se reflejan.
 */

/** Refleja un path absoluto (M/L/Q/C/Z) respecto al eje x = 100. */
function mirror(d: string) {
  let n = 0;
  return d.replace(/[MLQCZ]|-?\d+(\.\d+)?/g, (tok) => {
    if (/[MLQCZ]/.test(tok)) {
      n = 0;
      return tok;
    }
    const v = n % 2 === 0 ? 200 - parseFloat(tok) : parseFloat(tok);
    n++;
    return String(v);
  });
}
const pair = (d: string) => [d, mirror(d)];

const SILHOUETTE = pair(
  'M100 58 L90 58 Q72 62 58 68 Q44 74 42 92 L37 132 Q35 152 33 172 L31 196 Q30 208 37 209 Q44 209 45 198 L50 162 Q53 144 56 126 L61 104 L65 140 Q67 160 65 178 Q61 204 65 232 L69 280 Q69 304 72 332 L74 370 Q68 384 80 386 L90 386 Q93 378 91 366 L92 322 Q94 292 96 262 L99 214 L100 212 Z',
);

type Part = [MuscleId, string];
const mirrored = (m: MuscleId, d: string): Part[] => [
  [m, d],
  [m, mirror(d)],
];

const DELTOID = 'M58 69 Q46 74 44 90 Q46 100 52 104 Q58 92 66 84 Q70 74 64 68 Z';
const UPPER_ARM = 'M46 106 Q52 103 57 110 Q59 124 55 138 Q48 143 44 136 Q41 120 46 106 Z';
const FOREARM = 'M43 142 Q50 140 54 146 L50 172 Q46 190 42 194 Q36 193 36 186 Q38 160 43 142 Z';

const FRONT: Part[] = [
  ...mirrored('deltoides', DELTOID),
  ...mirrored('pectorales', 'M68 76 Q84 70 99 74 L99 104 Q84 109 70 102 Q63 92 68 76 Z'),
  ...mirrored('biceps', UPPER_ARM),
  ...mirrored('antebrazos', FOREARM),
  ['abdominales', 'M88 108 L112 108 Q114 140 110 176 Q100 182 90 176 Q86 140 88 108 Z'],
  ...mirrored('oblicuos', 'M70 106 Q78 109 86 110 Q84 140 88 174 Q76 170 68 160 Q65 130 70 106 Z'),
  ...mirrored('cuadriceps', 'M68 194 Q80 185 97 198 Q99 230 93 262 Q84 273 76 268 Q65 240 68 194 Z'),
  ...mirrored('tibiales', 'M73 292 Q79 286 85 291 Q87 320 83 352 Q77 357 75 350 Q70 320 73 292 Z'),
];

const BACK: Part[] = [
  ['trapecio', 'M100 52 Q112 60 128 70 Q118 78 110 84 L100 124 L90 84 Q82 78 72 70 Q88 60 100 52 Z'],
  ...mirrored('deltoides', DELTOID),
  ...mirrored('dorsales', 'M70 86 Q84 89 92 100 L98 128 Q92 150 85 164 Q74 156 68 140 Q64 110 70 86 Z'),
  ...mirrored('triceps', UPPER_ARM),
  ...mirrored('antebrazos', FOREARM),
  ['lumbares', 'M90 134 L110 134 Q112 160 108 177 L92 177 Q88 160 90 134 Z'],
  ...mirrored('gluteo', 'M68 184 Q84 177 99 185 L99 213 Q86 223 72 215 Q63 200 68 184 Z'),
  ...mirrored('isquios', 'M70 224 Q84 221 96 225 Q96 251 90 270 Q80 275 74 268 Q68 246 70 224 Z'),
  ...mirrored('gemelos', 'M70 289 Q80 282 88 290 Q90 314 84 340 Q78 347 74 340 Q66 314 70 289 Z'),
];

type Props = {
  /** select: colores por selección · heat: colores por carga (0-1) */
  mode?: 'select' | 'heat';
  selected?: MuscleId[];
  heat?: Partial<Record<MuscleId, number>>;
  onPress?: (m: MuscleId) => void;
  /** Ancho máximo disponible; la altura se calcula sola */
  width?: number;
  showLabel?: boolean;
  frontOnly?: boolean;
};

export function BodyMap({ mode = 'select', selected = [], heat = {}, onPress, width, showLabel = true, frontOnly }: Props) {
  const { theme } = useApp();
  const { width: screenW } = useWindowDimensions();
  const [last, setLast] = useState<MuscleId | null>(null);
  const isWeb = Platform.OS === 'web';
  const gid = 'hot' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const tap = (m: MuscleId) => {
    setLast(m);
    onPress?.(m);
  };

  const vbW = frontOnly ? 200 : 400;
  // Nunca negativo: en web la ventana puede medir 0 px mientras está oculta
  const w = Math.max(120, Math.min(width ?? screenW - 64, frontOnly ? 200 : 420));
  const h = (w / vbW) * 395;

  const style = (m: MuscleId) => {
    if (mode === 'heat') {
      const v = heat[m] ?? 0;
      return v > 0 ? { fill: `url(#${gid})`, fillOpacity: 0.25 + 0.75 * v } : { fill: theme.bodyBase, fillOpacity: 1 };
    }
    return selected.includes(m) ? { fill: `url(#${gid})`, fillOpacity: 1 } : { fill: theme.bodyBase, fillOpacity: 1 };
  };

  const figure = (parts: Part[], dx: number, prefix: string) => (
    <G transform={`translate(${dx} 0)`}>
      {/* Silueta + cabeza */}
      <G opacity={0.5}>
        {SILHOUETTE.map((d, i) => (
          <Path key={i} d={d} fill={theme.bodyBase} />
        ))}
        <Ellipse cx={100} cy={32} rx={16} ry={20} fill={theme.bodyBase} />
        <Path d="M92 48 L108 48 L110 62 L90 62 Z" fill={theme.bodyBase} />
      </G>
      {parts.map(([m, d], i) => {
        const active = last === m;
        return (
          <Path
            key={i}
            id={`m-${m}-${prefix}${i}`}
            d={d}
            {...style(m)}
            stroke={active ? theme.text : theme.bodyLine}
            strokeWidth={active ? 2.2 : 1.6}
            strokeLinejoin="round"
            {...(onPress && !isWeb ? { onPress: () => tap(m) } : {})}
          />
        );
      })}
    </G>
  );

  return (
    <View style={{ alignItems: 'center' }}>
      <Pressable
        disabled={!onPress || !isWeb}
        // En web, react-native-svg no entrega los toques de cada forma: se identifica el músculo por el id del elemento tocado.
        onPress={(e) => {
          const id: string | undefined = (e.nativeEvent as any).target?.id;
          if (id?.startsWith('m-')) tap(id.split('-')[1] as MuscleId);
        }}
      >
        <Svg width={w} height={h} viewBox={`0 0 ${vbW} 395`}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.primary} />
              <Stop offset="1" stopColor={theme.primary2} />
            </LinearGradient>
          </Defs>
          {figure(FRONT, 0, 'f')}
          {!frontOnly && figure(BACK, 200, 'b')}
        </Svg>
      </Pressable>
      {!frontOnly && (
        <View style={{ flexDirection: 'row', width: w, marginTop: -4 }}>
          {['FRENTE', 'ESPALDA'].map((t) => (
            <Text key={t} style={{ flex: 1, textAlign: 'center', color: theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
              {t}
            </Text>
          ))}
        </View>
      )}
      {showLabel && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: last ? theme.primarySoft : 'transparent',
          }}
        >
          <Text style={{ color: last ? theme.primary : theme.muted, fontSize: 13, fontWeight: '700' }}>
            {last ? MUSCLES[last].name : onPress ? 'Toca un músculo para seleccionarlo' : ' '}
          </Text>
          {last ? (
            <Text style={{ color: theme.muted, fontSize: 12, marginLeft: 6 }}>· {GROUPS.find((g) => g.id === MUSCLES[last].group)!.name}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
