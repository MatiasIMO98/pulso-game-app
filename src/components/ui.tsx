import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';

export const Icon = MaterialCommunityIcons;

export function Screen({ children, title, subtitle, right }: { children: React.ReactNode; title?: string; subtitle?: string; right?: React.ReactNode }) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>{title}</Text>
            {subtitle ? <Text style={{ color: theme.muted, fontSize: 14, marginTop: 2 }}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useApp();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 24,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOpacity: theme.dark ? 0.25 : 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const { theme } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{children}</Text>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress, color, icon }: { label: string; active?: boolean; onPress?: () => void; color?: string; icon?: string }) {
  const { theme } = useApp();
  const c = color ?? theme.primary;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        marginRight: 8,
        marginBottom: 8,
        backgroundColor: active ? c : theme.cardAlt,
        borderWidth: 1,
        borderColor: active ? c : theme.border,
      }}
    >
      {icon ? <Icon name={icon as any} size={14} color={active ? theme.onPrimary : theme.muted} style={{ marginRight: 5 }} /> : null}
      <Text style={{ color: active ? theme.onPrimary : theme.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  style,
  colors,
}: {
  label: string;
  onPress?: () => void;
  icon?: string;
  variant?: 'primary' | 'ghost' | 'soft';
  style?: StyleProp<ViewStyle>;
  /** Degradado personalizado para la variante primaria */
  colors?: [string, string];
}) {
  const { theme } = useApp();
  const fg = variant === 'primary' ? (colors ? '#FFFFFF' : theme.onPrimary) : theme.primary;
  const content = (
    <>
      {icon ? <Icon name={icon as any} size={19} color={fg} style={{ marginRight: 8 }} /> : null}
      <Text style={{ color: fg, fontWeight: '800', fontSize: 15, letterSpacing: 0.2 }}>{label}</Text>
    </>
  );
  const inner: ViewStyle = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 18 };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: 18,
          backgroundColor: variant === 'soft' ? theme.primarySoft : 'transparent',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          ...(variant === 'primary'
            ? { shadowColor: (colors ?? [theme.primary])[0], shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }
            : {}),
        },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={colors ?? [theme.primary, theme.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={inner}>
          {content}
        </LinearGradient>
      ) : (
        <View style={inner}>{content}</View>
      )}
    </Pressable>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const { theme } = useApp();
  return (
    <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 8 }}>{children}</Text>
  );
}

/** Pastilla con icono y degradado suave para cabeceras. */
export function IconBadge({ icon, size = 40, color }: { icon: string; size?: number; color?: string }) {
  const { theme } = useApp();
  const c = color ?? theme.primary;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: c + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c + '40' }}>
      <Icon name={icon as any} size={size * 0.5} color={c} />
    </View>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  const { theme } = useApp();
  const btn = (icon: string, d: number) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: theme.cardAlt, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={icon as any} size={18} color={theme.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {btn('minus', -step)}
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, minWidth: 64, textAlign: 'center' }}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      {btn('plus', step)}
    </View>
  );
}

export function Row({ label, hint, children, icon }: { label: string; hint?: string; children?: React.ReactNode; icon?: string }) {
  const { theme } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
      {icon ? (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Icon name={icon as any} size={18} color={theme.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        {hint ? <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { theme } = useApp();
  const webProps = Platform.OS === 'web' ? ({ activeThumbColor: '#fff' } as object) : {};
  return <Switch value={value} onValueChange={onChange} trackColor={{ true: theme.primary, false: theme.border }} thumbColor="#fff" {...webProps} />;
}

export function Divider() {
  const { theme } = useApp();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginVertical: 2 }} />;
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { theme } = useApp();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: theme.cardAlt, borderRadius: 14, padding: 4 }}>
      {options.map((o) => {
        const a = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: a ? theme.card : 'transparent', alignItems: 'center' }}>
            <Text style={{ color: a ? theme.text : theme.muted, fontWeight: '700', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Oscurece (f<1) o aclara (f>1) un color hex de 6 dígitos. */
export const shade = (hex: string, f = 0.72) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return '#' + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
};

export const fmtTime =(s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, '0')}`;
