import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';
import { authStorage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Si faltan las variables de entorno, la app funciona en modo demo (datos locales de ejemplo). */
export const cloudEnabled = !!url && !!key;

const isWeb = Platform.OS === 'web';

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        // En web Supabase lee el ?code= al volver de Google; en móvil lo procesamos nosotros.
        detectSessionInUrl: isWeb,
        flowType: 'pkce',
      },
    })
  : null;

if (supabase && !isWeb) {
  // Refresca el token solo con la app en primer plano.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

if (isWeb) WebBrowser.maybeCompleteAuthSession();

/** Dirección a la que Google/Supabase devuelven al usuario. Debe estar permitida en Supabase. */
export const redirectUri = () => (isWeb ? window.location.origin : makeRedirectUri({ scheme: 'pulso', path: 'auth' }));

const pending = new Map<string, Promise<void>>();

/**
 * Completa la sesión a partir del enlace de vuelta (pulso://auth?code=…).
 * Puede llamarse dos veces con el mismo enlace (navegador + deep link): el código se canjea una sola vez.
 */
export function sessionFromUrl(link: string): Promise<void> {
  let p = pending.get(link);
  if (!p) {
    p = exchangeFromUrl(link);
    pending.set(link, p);
  }
  return p;
}

async function exchangeFromUrl(link: string) {
  const parsed = new URL(link);
  const query = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const err = query.get('error_description') ?? hash.get('error_description');
  if (err) throw new Error(err);
  const code = query.get('code');
  if (code) {
    const { error } = await supabase!.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase!.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return;
  }
  throw new Error('No se recibió la sesión de Google.');
}

/** Inicia sesión con Google. Devuelve false si el usuario cancela. */
export async function signInWithGoogle(): Promise<boolean> {
  if (!supabase) throw new Error('La nube no está configurada.');
  const redirectTo = redirectUri();

  if (isWeb) {
    // En web basta con redirigir; al volver, Supabase completa la sesión.
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw error;
    return true;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return false;
  await sessionFromUrl(res.url);
  return true;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

/** Identificador aleatorio (UUID v4) para crear filas desde el cliente. */
export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
