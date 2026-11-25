import { sessionFromUrl } from '../lib/supabase';

/**
 * Al volver de Google, Android abre la app con pulso://auth?code=…
 * Esa ruta no existe como pantalla: canjeamos el código y mandamos al inicio.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (/(^|[/:])auth\b/.test(path) && /[?#&](code|access_token|error_description)=/.test(path)) {
      const link = path.includes('://') ? path : `pulso://${path.replace(/^\/+/, '')}`;
      sessionFromUrl(link).catch((e) => console.warn('No se pudo completar el inicio de sesión', e));
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
