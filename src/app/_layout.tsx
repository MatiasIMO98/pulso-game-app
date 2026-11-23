import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentDock, AgentFace } from '../components/AgentDock';
import { Icon } from '../components/ui';
import { AppProvider, useApp } from '../store';

function Shell() {
  const { theme, user, authReady, loadingData, syncError, settings } = useApp();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const nav = theme.dark ? DarkTheme : DefaultTheme;
  const inSession = path.startsWith('/sesion');
  const onTabs = !inSession && !path.startsWith('/rutina') && !path.startsWith('/progreso');

  return (
    <ThemeProvider value={{ ...nav, colors: { ...nav.colors, background: theme.bg, card: theme.card, text: theme.text, border: theme.border, primary: theme.primary } }}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          {/* Cuestionario de bienvenida: solo cuentas que aún no lo completaron ni saltaron */}
          <Stack.Protected guard={!!user && !settings.onboardingDone}>
            <Stack.Screen name="bienvenida" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={!!user && settings.onboardingDone}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="rutina" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="progreso" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="sesion" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
          </Stack.Protected>
        </Stack>
        {user && !loadingData && settings.onboardingDone ? <AgentDock bottomOffset={onTabs ? 72 : inSession ? 24 : 96} /> : null}

        {/* Aviso si falla la sincronización */}
        {user && syncError ? (
          <View
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 16,
              right: 16,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.card,
              borderColor: theme.danger,
              borderWidth: 1,
              borderRadius: 14,
              padding: 10,
            }}
          >
            <Icon name="cloud-alert" size={18} color={theme.danger} />
            <Text style={{ color: theme.text, fontSize: 12, marginLeft: 8, flex: 1 }} numberOfLines={2}>
              No se pudo sincronizar: {syncError}
            </Text>
          </View>
        ) : null}

        {/* Pantalla de carga mientras se recupera la sesión o se descargan los datos */}
        {!authReady || loadingData ? (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
            <AgentFace mood="happy" size={84} color={theme.primary} color2={theme.primary2} bg={theme.bg} />
            <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
            <Text style={{ color: theme.muted, marginTop: 10 }}>{loadingData ? 'Cargando tu progreso…' : 'Preparando Pulso…'}</Text>
          </View>
        ) : null}
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}
