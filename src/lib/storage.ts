// Web: el localStorage del navegador (no existe durante el renderizado en servidor).
export const authStorage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined;
