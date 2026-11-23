// iOS / Android: localStorage persistente respaldado por SQLite (recomendado por Expo para Supabase).
import 'expo-sqlite/localStorage/install';

export const authStorage = globalThis.localStorage;
