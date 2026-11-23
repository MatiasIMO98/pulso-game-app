# Configurar la nube (Supabase + Google)

Sin estos pasos la app arranca en **modo demo** (datos de ejemplo que no se guardan).
Tiempo aproximado: 15–20 minutos. Todo es gratuito.

## 1. Crear el proyecto en Supabase

1. Entra en <https://supabase.com> y crea una cuenta.
2. **New project** → ponle un nombre (p. ej. `pulso`), elige una contraseña para la base de datos y la región más cercana.
3. Espera a que termine de crearse (1–2 min).

## 2. Crear las tablas

1. En el menú lateral: **SQL Editor** → **New query**.
2. Pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. En **Table Editor** deberías ver: `user_settings`, `workouts`, `calendar_events`, `routine_templates`, `measurements`.

## 3. Copiar las claves a la app

1. **Project Settings → API Keys**: copia la **publishable key** (o la `anon` key si es lo que aparece).
2. **Project Settings → Data API**: copia la **Project URL**.
3. En la carpeta `pulso`, copia `.env.example` como `.env` y pega ambos valores.

> La clave publicable puede ir dentro de la app: las reglas de seguridad (RLS) del paso 2 impiden que un usuario lea datos de otro. **Nunca** uses la clave `service_role` / secreta.

## 4. Crear el acceso con Google

### En Google Cloud
1. Entra en <https://console.cloud.google.com> y crea un proyecto.
2. **APIs & Services → OAuth consent screen**: tipo *External*, nombre de la app `Pulso`, tu correo de soporte. Añádete como *test user* mientras esté en pruebas.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Tipo: **Web application**.
   - En **Authorized redirect URIs** pega la *Callback URL* que muestra Supabase en
     **Authentication → Sign In / Providers → Google** (tiene la forma `https://TU-PROYECTO.supabase.co/auth/v1/callback`).
4. Copia el **Client ID** y el **Client secret**.

### En Supabase
1. **Authentication → Sign In / Providers → Google**: actívalo y pega el Client ID y el Client secret. Guarda.
2. **Authentication → URL Configuration → Redirect URLs**, añade:
   - `pulso://**` (app compilada)
   - `exp://**` (pruebas con Expo Go)
   - `http://localhost:8081` (pruebas en el navegador)

## 5. Probar

```
npx expo start --clear
```

En la pantalla de inicio aparecerá **Continuar con Google**. Tras entrar, cualquier entrenamiento, evento, medida o ajuste se guarda en tu proyecto (puedes verlo en **Table Editor**).

## Problemas frecuentes

| Síntoma | Causa probable |
| --- | --- |
| Sigue apareciendo "modo demo" | Falta el `.env` o no reiniciaste con `--clear` |
| Google dice `redirect_uri_mismatch` | La Callback URL de Supabase no está en Google Cloud (paso 4.3) |
| Vuelve a la app pero no entra | Falta la URL de retorno en *Redirect URLs* de Supabase (paso 4, Supabase 2) |
| "No se pudo sincronizar" | No se ejecutó `schema.sql` o falló alguna tabla |
| `policy "own rows" ... already exists` al ejecutar `schema.sql` | El script ya se ejecutó antes: las tablas y políticas ya existen, no hace falta repetirlo |
