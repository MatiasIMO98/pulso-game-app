import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import type { Mood } from '../agent/agent';
import { novaStage } from '../agent/progress';
import { useApp } from '../store';
import { fmtTime, Icon } from './ui';

const SIZE = 60;
const native = Platform.OS !== 'web';
/** Color propio de la fase de preparación (distinto de cualquier tipo de entrenamiento). */
export const PREP_COLOR = '#7C8CFF';

/** Parpadeo aleatorio cada pocos segundos. */
function useBlink() {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setClosed(true);
        t = setTimeout(() => {
          setClosed(false);
          loop();
        }, 140);
      }, 2500 + Math.random() * 3000);
    };
    loop();
    return () => clearTimeout(t);
  }, []);
  return closed;
}

/** Abre y cierra la boca mientras "habla". */
function useTalk(active: boolean) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active) return setOpen(false);
    const i = setInterval(() => setOpen((o) => !o), 150);
    return () => clearInterval(i);
  }, [active]);
  return open;
}

export function AgentFace({
  mood,
  size = SIZE,
  color,
  color2,
  bg,
  talking = false,
  animated = true,
  stage: stageProp,
}: {
  mood: Mood;
  size?: number;
  color: string;
  color2?: string;
  bg: string;
  talking?: boolean;
  animated?: boolean;
  /** Etapa de evolución (0–4). Por defecto, la que corresponde al nivel del usuario. */
  stage?: number;
}) {
  const { settings } = useApp();
  const stage = stageProp ?? novaStage(settings.progress?.level ?? 1);
  const blinkState = useBlink();
  const mouthOpen = useTalk(talking);
  const blink = animated && blinkState;
  const c2 = color2 ?? color;
  const GOLD = '#FFC23D';
  const accent = stage >= 4 ? GOLD : c2;
  const gid = `ag${size}${color.replace('#', '')}`;

  let eyes: React.ReactNode;
  if (blink || mood === 'calm') {
    eyes = <Path d="M20 27 q4 3 8 0 M32 27 q4 3 8 0" stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />;
  } else if (mood === 'hype') {
    eyes = <Path d="M20 28 l4 -5 l4 5 M32 28 l4 -5 l4 5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
  } else {
    const ry = mood === 'alert' ? 5 : 4.2;
    eyes = (
      <>
        <Ellipse cx={24} cy={26} rx={3.4} ry={ry} fill={color} />
        <Ellipse cx={36} cy={26} rx={3.4} ry={ry} fill={color} />
        <Circle cx={25.2} cy={24.6} r={1.1} fill={bg} />
        <Circle cx={37.2} cy={24.6} r={1.1} fill={bg} />
      </>
    );
  }

  let mouth: React.ReactNode;
  if (talking) {
    mouth = mouthOpen ? <Ellipse cx={30} cy={38} rx={5} ry={4} fill={color} /> : <Path d="M25 37 q5 3 10 0" stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />;
  } else if (mood === 'hype') {
    mouth = <Path d="M22 35 Q30 46 38 35 Z" fill={color} />;
  } else if (mood === 'focus') {
    mouth = <Path d="M25 38 h10" stroke={color} strokeWidth={2.8} strokeLinecap="round" />;
  } else if (mood === 'alert') {
    mouth = <Ellipse cx={30} cy={38} rx={3} ry={3.4} fill={color} />;
  } else {
    mouth = <Path d="M23 35 q7 7 14 0" stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />;
  }

  return (
    <Svg width={size} height={size} viewBox="-4 -4 68 68">
      {/* Etapa 2+: aura de energía */}
      {stage >= 2 && <Circle cx={30} cy={30} r={31.5} stroke={accent} strokeWidth={1.6} strokeDasharray="3 4" fill="none" opacity={0.8} />}
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} />
          <Stop offset="1" stopColor={c2} />
        </LinearGradient>
        <RadialGradient id={`${gid}s`} cx="0.35" cy="0.3" r="0.8">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={30} cy={30} r={28} fill={`url(#${gid})`} />
      <Circle cx={30} cy={30} r={22} fill={bg} />
      <Circle cx={30} cy={30} r={22} fill={`url(#${gid}s)`} />
      {/* Mejillas */}
      {(mood === 'happy' || mood === 'hype') && (
        <>
          <Circle cx={18} cy={34} r={2.6} fill={color} opacity={0.25} />
          <Circle cx={42} cy={34} r={2.6} fill={color} opacity={0.25} />
        </>
      )}
      {/* Etapa 1+: cinta deportiva */}
      {stage >= 1 && (
        <>
          <Path d="M10 21 Q30 8 50 21" stroke={accent} strokeWidth={4.5} strokeLinecap="round" fill="none" />
          <Path d="M49 21 l6 -4 M49 21 l6 3" stroke={accent} strokeWidth={2.6} strokeLinecap="round" />
        </>
      )}
      {/* Etapa 3+: corona */}
      {stage >= 3 && <Path d="M21 4 L23 -3 L27 1 L30 -4 L33 1 L37 -3 L39 4 Z" fill={GOLD} stroke={bg} strokeWidth={1} strokeLinejoin="round" />}
      {eyes}
      {mouth}
    </Svg>
  );
}

function Ring({ progress, color, track }: { progress: number; color: string; track: string }) {
  const r = 33;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={SIZE + 16} height={SIZE + 16} viewBox="0 0 76 76" style={{ position: 'absolute' }}>
      <Circle cx={38} cy={38} r={r} stroke={track} strokeWidth={4} fill="none" />
      <Circle
        cx={38}
        cy={38}
        r={r}
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={c * (1 - progress)}
        strokeLinecap="round"
        transform="rotate(-90 38 38)"
      />
    </Svg>
  );
}

/** Texto que aparece letra a letra. */
function useTypewriter(text: string | undefined) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const step = Math.max(1, Math.ceil(text.length / 30));
    const i = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(i), x) : x + step)), 22);
    return () => clearInterval(i);
  }, [text]);
  return { shown: text?.slice(0, n) ?? '', typing: !!text && n < text.length };
}

const PHASE_LABEL = { prep: 'Prepárate', work: 'Trabajo', rest: 'Descanso', set: 'Serie' } as const;

/** Agente flotante pegado a un borde de la pantalla. */
export function AgentDock({ bottomOffset = 96 }: { bottomOffset?: number }) {
  const { theme, settings, bubble, dismissBubble, agentStatus } = useApp();
  const insets = useSafeAreaInsets();
  const [collapsed, setCollapsed] = useState(false);
  const float = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const { shown, typing } = useTypewriter(bubble?.text);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2000, useNativeDriver: native }),
        Animated.timing(float, { toValue: 0, duration: 2000, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  useEffect(() => {
    pop.setValue(0);
    halo.setValue(0);
    if (bubble) {
      Animated.spring(pop, { toValue: 1, useNativeDriver: native, friction: 7, tension: 80 }).start();
      Animated.timing(halo, { toValue: 1, duration: 900, useNativeDriver: native }).start();
    }
  }, [bubble, pop, halo]);

  if (!settings.agentEnabled) return null;
  if (agentStatus && !settings.agentInWorkout) return null;

  const right = settings.agentSide === 'right';
  const side = right ? { right: 0 } : { left: 0 };
  const statusColor = agentStatus?.phase === 'rest' ? theme.success : agentStatus?.phase === 'prep' ? PREP_COLOR : theme.primary;

  if (collapsed) {
    return (
      <Pressable
        onPress={() => setCollapsed(false)}
        style={{
          position: 'absolute',
          ...side,
          bottom: bottomOffset + insets.bottom + 12,
          width: 22,
          height: 52,
          backgroundColor: theme.primary,
          borderTopLeftRadius: right ? 14 : 0,
          borderBottomLeftRadius: right ? 14 : 0,
          borderTopRightRadius: right ? 0 : 14,
          borderBottomRightRadius: right ? 0 : 14,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.9,
        }}
      >
        <Icon name={right ? 'chevron-left' : 'chevron-right'} size={18} color={theme.onPrimary} />
      </Pressable>
    );
  }

  const mood: Mood = bubble?.mood ?? (agentStatus ? (agentStatus.phase === 'rest' ? 'calm' : 'focus') : 'happy');
  const faceColor = agentStatus ? statusColor : theme.primary;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', ...side, bottom: bottomOffset + insets.bottom, flexDirection: right ? 'row' : 'row-reverse', alignItems: 'flex-end', paddingHorizontal: 6 }}
    >
      {bubble ? (
        <Animated.View
          style={{
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }, { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [right ? 12 : -12, 0] }) }],
            maxWidth: 210,
            marginBottom: 18,
          }}
        >
          <Pressable
            onPress={dismissBubble}
            style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 18,
              borderBottomRightRadius: right ? 6 : 18,
              borderBottomLeftRadius: right ? 18 : 6,
              paddingHorizontal: 12,
              paddingVertical: 9,
              marginHorizontal: 4,
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginRight: 5 }} />
              <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>{settings.agentName.toUpperCase()}</Text>
            </View>
            <Text style={{ color: theme.text, fontSize: 13, lineHeight: 18 }}>
              {shown}
              {typing ? <Text style={{ color: theme.primary }}>▍</Text> : null}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <Animated.View style={{ alignItems: 'center', transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }}>
        <Pressable onPress={() => (bubble ? dismissBubble() : setCollapsed(true))} onLongPress={() => setCollapsed(true)}>
          <View style={{ width: SIZE + 16, height: SIZE + 16, alignItems: 'center', justifyContent: 'center' }}>
            {/* Halo al hablar */}
            <Animated.View
              style={{
                position: 'absolute',
                width: SIZE,
                height: SIZE,
                borderRadius: SIZE / 2,
                backgroundColor: faceColor,
                opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
                transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
              }}
            />
            {agentStatus ? <Ring progress={agentStatus.total ? agentStatus.remaining / agentStatus.total : 0} color={statusColor} track={theme.border} /> : null}
            <View style={{ shadowColor: faceColor, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8, borderRadius: SIZE / 2 }}>
              <AgentFace mood={mood} color={faceColor} color2={agentStatus ? statusColor : theme.primary2} bg={theme.card} talking={typing} size={agentStatus ? SIZE - 8 : SIZE} />
            </View>
          </View>
        </Pressable>
        {agentStatus ? (
          <View style={{ backgroundColor: statusColor, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: -6 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', textAlign: 'center' }}>
              {PHASE_LABEL[agentStatus.phase]} {agentStatus.phase !== 'set' ? fmtTime(agentStatus.remaining) : ''}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}
