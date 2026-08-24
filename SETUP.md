# KidsMin — Guía de instalación 🚀

Todo lo que necesitas para poner en marcha la plataforma desde cero.

---

## 1. Crear la base de datos (Supabase)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta o inicia sesión.
2. Clic en **New Project**.
3. Llena los datos:
   - **Nombre**: el nombre de tu iglesia o proyecto.
   - **Contraseña de BD**: genera una segura y guárdala.
   - **Región**: la más cercana a ti.
4. Espera 1–2 minutos a que termine de crearse.

### Crear las tablas

1. En el menú izquierdo de Supabase, entra a **SQL Editor**.
2. Clic en **New query**.
3. Abre el archivo `supabase/schema.sql` de este proyecto, copia **todo** su contenido y pégalo ahí.
4. Clic en **Run**. Debe decir "Success".

### Crear el primer administrador

1. En el mismo SQL Editor, abre una **nueva query**.
2. Copia el contenido de `supabase/primer_admin.sql`.
3. Cambia el correo y la contraseña por los tuyos donde dice.
4. Clic en **Run**.

> Si más adelante necesitas crear otro admin, usa `supabase/crear_admin.sql` de la misma forma.

### Configurar Storage (archivos)

La app necesita 3 "carpetas" (buckets) en Supabase Storage para guardar archivos. Esto NO lo hace el `schema.sql` — se configura manualmente en el panel de Supabase. Solo tienes que hacerlo una vez.

#### Paso A: Crear los 3 buckets

1. En el menú izquierdo de Supabase, clic en **Storage**.
2. Clic en el botón **New bucket**.
3. Crea el primero:
   - **Name**: `actividades`
   - **Public bucket**: ✅ actívalo (el toggle debe quedar encendido)
   - Clic en **Create bucket**
4. Repite para los otros dos:

| Nombre del bucket | Público | Qué se guarda ahí |
|---|---|---|
| `actividades` | ✅ Sí | Fotos de actividades, devocionales, bitácora, materiales, entregas de tareas |
| `drive` | ✅ Sí | Archivos del drive compartido de la iglesia |
| `logos` | ✅ Sí | Logo de la iglesia (el que aparece en el menú y login) |

> ⚠️ Los nombres deben ser **exactamente** esos, en minúsculas, sin espacios.

Cuando termines debes ver los 3 buckets en la lista de Storage.

#### Paso B: Crear las políticas de acceso (para cada bucket)

Sin políticas, nadie puede subir ni ver archivos. Necesitas **2 políticas por bucket** (6 en total). Repite estos pasos para cada uno de los 3 buckets:

**Política 1 — Lectura pública (cualquiera puede ver los archivos):**

1. Clic en el bucket (ej: `actividades`).
2. Clic en la pestaña **Policies** (arriba).
3. Clic en **New policy**.
4. Elige **For full customization** (o "Get started quickly" → "Allow access to all users").
5. Llena así:
   - **Policy name**: `Lectura publica`
   - **Allowed operation**: `SELECT`
   - **Target roles**: déjalo vacío (aplica a todos)
   - **USING expression**: `true`
6. Clic en **Review** → **Save policy**.

**Política 2 — Escritura para usuarios logueados:**

1. En el mismo bucket, clic en **New policy** otra vez.
2. Elige **For full customization**.
3. Llena así:
   - **Policy name**: `Escritura autenticados`
   - **Allowed operation**: selecciona **INSERT**, **UPDATE** y **DELETE** (los 3)
   - **Target roles**: escribe `authenticated`
   - **USING expression**: `true`
   - **WITH CHECK expression**: `true`
4. Clic en **Review** → **Save policy**.

5. **Repite las 2 políticas** para el bucket `drive` y para el bucket `logos`.

#### Verificar que quedó bien

Cuando termines, cada bucket debe tener 2 políticas:

```
actividades
  ├── Lectura publica    (SELECT, todos)
  └── Escritura autenticados (INSERT/UPDATE/DELETE, authenticated)

drive
  ├── Lectura publica    (SELECT, todos)
  └── Escritura autenticados (INSERT/UPDATE/DELETE, authenticated)

logos
  ├── Lectura publica    (SELECT, todos)
  └── Escritura autenticados (INSERT/UPDATE/DELETE, authenticated)
```

> 💡 Si ya tienes un proyecto de Supabase con el schema pero sin buckets, solo necesitas hacer este paso. No tienes que volver a correr el schema.sql.

### Obtener las llaves

1. Ve a **Settings** → **API** (en el menú izquierdo).
2. Copia estos dos valores, los necesitarás en el paso 3:
   - **Project URL** → algo como `https://xxxxxxx.supabase.co`
   - **anon public key** → un texto largo que empieza con `eyJ...`

---

## 2. Subir el código a GitHub

1. Ve a [github.com](https://github.com) → **New repository**.
2. Ponle el nombre que quieras (ej: `kidsmin`).
3. Déjalo **vacío** (NO marques "Add README").
4. Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
git init
git add .
git commit -m "Versión inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

---

## 3. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta o inicia sesión.
2. Clic en **Add New** → **Project**.
3. Selecciona **Import Git Repository** y elige el repo que acabas de crear.
4. En la configuración del proyecto:
   - **Framework Preset**: Vite (Vercel lo detecta solo).
   - **Build Command**: `npm run build` (viene por defecto).
   - **Output Directory**: `dist` (viene por defecto).
5. En **Environment Variables**, agrega estas dos:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Tu Project URL de Supabase (del paso 1) |
| `VITE_SUPABASE_ANON_KEY` | Tu anon public key de Supabase (del paso 1) |

6. Clic en **Deploy**.
7. Espera unos segundos y Vercel te dará tu URL (ej: `tu-proyecto.vercel.app`).

### Dominio personalizado (opcional)

Si tienes un dominio propio:
1. En Vercel → tu proyecto → **Settings** → **Domains**.
2. Agrega tu dominio y sigue las instrucciones para apuntar el DNS.

---

## 4. Configurar autenticación en Supabase

Para que el login funcione correctamente desde tu dominio de Vercel:

1. En Supabase → **Authentication** → **URL Configuration**.
2. En **Site URL**, pon tu URL de Vercel:
   ```
   https://tu-proyecto.vercel.app
   ```
3. En **Redirect URLs**, agrega:
   ```
   https://tu-proyecto.vercel.app/**
   ```

---

## 5. Primer ingreso

1. Abre tu URL de Vercel en el navegador.
2. Inicia sesión con el correo y contraseña que pusiste en `primer_admin.sql`.
3. Ya eres admin. Desde ahí puedes crear coordinadores, docentes y padres.

---

## Resumen de archivos de Supabase

| Archivo | Cuándo usarlo |
|---|---|
| `schema.sql` | Una sola vez, al crear el proyecto. Crea todas las tablas, funciones y permisos. |
| `primer_admin.sql` | Una sola vez, para crear tu primer usuario administrador. |
| `crear_admin.sql` | Cuando necesites crear otro administrador después. |

---

## Actualizaciones futuras

Cada vez que hagas cambios al código:

1. Haz commit y push a `main`:
   ```bash
   git add .
   git commit -m "descripción del cambio"
   git push
   ```
2. Vercel detecta el push y despliega automáticamente. No tienes que hacer nada más.
