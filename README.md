# KidsMin 📖

Sistema de gestión para escuelas dominicales cristianas: niños, clases, docentes, asistencia, actividades, devocionales y agenda — con un portal para padres.

## Stack

- React + Vite + Tailwind
- Supabase (base de datos, autenticación, storage de archivos)

## Roles

- **Admin / Coordinador**: gestiona niños, clases, docentes, invita usuarios.
- **Docente**: toma asistencia, publica actividades (con archivos), agenda eventos, en sus clases asignadas.
- **Padre / Madre**: ve la información de sus hijos, reacciona a las actividades, ve la agenda.

Las cuentas de docentes y padres solo las crea un admin/coordinador (botón "Invitar" en cada sección), que envía un correo de invitación.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa con tu URL y anon key de Supabase
npm run dev
```

## Despliegue

Cada push a `main` despliega automáticamente a GitHub Pages vía GitHub Actions (`.github/workflows/deploy.yml`).

Para activarlo (una sola vez):

1. En GitHub: **Settings → Secrets and variables → Actions**, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. En **Settings → Pages**, en "Source" elige **GitHub Actions**.
3. Haz push a `main` (o correlo manualmente desde la pestaña Actions).
