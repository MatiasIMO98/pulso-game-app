# Pulso · prototipo visual

App de ejercicio con un agente IA (Nova) que acompaña desde el borde de la pantalla.
Expo SDK 58 + Expo Router + react-native-svg.

## Ejecutar

Requiere Node.js 22.13 o superior.

```
npm install
npx expo start          # escanea el QR con Expo Go (Android/iOS)
npx expo start --web    # vista rápida en el navegador
```

## Estructura

- `src/app/` — pantallas (Expo Router)
  - `login.tsx` — acceso (simulado)
  - `(tabs)/index.tsx` — Entrenar: tipo, cuerpo interactivo, opciones, balance muscular
  - `(tabs)/calendario.tsx` — calendario, recordatorios, rutinas semanales, notificaciones
  - `(tabs)/medidas.tsx` — medidas corporales con cuerpo seleccionable y gráfico
  - `(tabs)/ajustes.tsx` — cuenta, agente (5 intensidades), notificaciones, temas, sonido
  - `rutina.tsx` — rutina generada (cambiar ejercicio / regenerar)
  - `sesion.tsx` — cronómetro de trabajo/descanso guiado por el agente
- `src/agent/agent.ts` — lógica del agente **simulada** (generación de rutinas, frases por intensidad,
  análisis de balance, comentarios de medidas). Es el único archivo que hay que cambiar para conectar Claude.
- `src/components/` — `AgentDock` (agente flotante), `BodyMap` (cuerpo SVG), `ui` (componentes base)
- `src/store.tsx` — estado global en memoria con datos de ejemplo (aún sin backend)

## Experiencia y niveles

`src/agent/progress.ts` — XP por intervalo/serie, nivel del atleta (1–50) y por grupo muscular (1–10),
retos para subir de nivel (rutina concreta, ejercicios concretos o requisito) y evolución de Nova.
Pantalla: `src/app/progreso.tsx`. El progreso se guarda dentro de los ajustes del usuario (sin tablas nuevas).

## Nube

Login con Google y datos sincronizados en Supabase. Guía paso a paso en [SUPABASE.md](SUPABASE.md).
Sin el archivo `.env` la app arranca en **modo demo** con datos de ejemplo.

- `src/lib/supabase.ts` — cliente, login con Google (navegador + PKCE) y cierre de sesión
- `src/lib/cloud.ts` — lectura y escritura de las tablas
- `supabase/schema.sql` — tablas y reglas de seguridad por usuario

## Pendiente (siguientes fases)

- Conectar el agente a la API de Claude a través del backend (sin exponer la clave en la app)
- Notificaciones push reales (expo-notifications), sonidos y voz (expo-speech)
- Persistencia local y unidades imperiales
