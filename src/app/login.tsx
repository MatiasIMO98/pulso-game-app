import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentFace } from '../components/AgentDock';
import { Button, Icon } from '../components/ui';
import { useApp } from '../store';

export default function Login() {
  const { theme, loginGoogle, loginDemo, mode, settings } = useApp();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cloud = mode === 'cloud';

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginGoogle();
    } catch (e) {
      setError((e as Error).message || 'No se pudo iniciar sesión con Google.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient colors={[theme.primary + '33', theme.bg]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 380 }} />
      <View style={{ flex: 1, paddingTop: insets.top + 64, paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ shadowColor: theme.primary, shadowOpacity: 0.6, shadowRadius: 30, elevation: 10, borderRadius: 999 }}>
            <AgentFace mood="hype" size={104} color={theme.primary} color2={theme.primary2} bg={theme.bg} />
          </View>
          <Text style={{ color: theme.text, fontSize: 44, fontWeight: '900', letterSpacing: -1.5, marginTop: 18 }}>Pulso</Text>
          <Text style={{ color: theme.muted, fontSize: 15, marginTop: 6, textAlign: 'center', lineHeight: 21 }}>
            Entrena con {settings.agentName}, tu coach con IA.{'\n'}Tu progreso, guardado en la nube.
          </Text>
        </View>

        <View style={{ marginTop: 48 }}>
          {cloud ? (
            <Pressable
              onPress={google}
              disabled={busy}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 18,
                paddingVertical: 15,
                opacity: busy ? 0.7 : pressed ? 0.85 : 1,
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 4,
              })}
            >
              {busy ? <ActivityIndicator color="#1F1F1F" /> : <Icon name="google" size={20} color="#4285F4" />}
              <Text style={{ color: '#1F1F1F', fontWeight: '800', fontSize: 16, marginLeft: 10 }}>{busy ? 'Conectando…' : 'Continuar con Google'}</Text>
            </Pressable>
          ) : (
            <>
              <View style={{ flexDirection: 'row', backgroundColor: theme.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 14 }}>
                <Icon name="cloud-off-outline" size={20} color={theme.accent} />
                <Text style={{ color: theme.muted, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 }}>
                  La nube aún no está configurada. Añade las claves de Supabase en el archivo .env para activar el acceso con Google.
                </Text>
              </View>
              <Button label="Probar en modo demo" icon="play-circle-outline" onPress={loginDemo} />
            </>
          )}

          {error ? (
            <View style={{ flexDirection: 'row', backgroundColor: theme.danger + '22', borderRadius: 14, padding: 12, marginTop: 14 }}>
              <Icon name="alert-circle-outline" size={18} color={theme.danger} />
              <Text style={{ color: theme.text, fontSize: 13, marginLeft: 8, flex: 1 }}>{error}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', marginBottom: insets.bottom + 24 }}>
          <Icon name="shield-check-outline" size={14} color={theme.muted} />
          <Text style={{ color: theme.muted, fontSize: 12, marginLeft: 6, textAlign: 'center' }}>Solo tú puedes ver tus datos de entrenamiento</Text>
        </View>
      </View>
    </View>
  );
}
