import { Tabs } from 'expo-router';
import React from 'react';
import { Icon } from '../../components/ui';
import { useApp } from '../../store';

export default function TabsLayout() {
  const { theme } = useApp();
  const icon = (name: string) => ({ color, size }: { color: any; size: number }) => <Icon name={name as any} size={size} color={color} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Entrenar', tabBarIcon: icon('lightning-bolt') }} />
      <Tabs.Screen name="calendario" options={{ title: 'Calendario', tabBarIcon: icon('calendar-month') }} />
      <Tabs.Screen name="medidas" options={{ title: 'Medidas', tabBarIcon: icon('human-male-height') }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: icon('cog-outline') }} />
    </Tabs>
  );
}
