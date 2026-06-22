# Polla Colombia 2026 - La Gaitana Farms

App web para predecir solo los partidos de Colombia en el Mundial 2026.

## Stack

- React 18 + Vite 5 + TypeScript
- Supabase Auth
- Supabase Postgres con RLS
- Tailwind CSS v3
- Deploy frontend en Vercel

## Funcionalidad

- Login y registro con Supabase Auth.
- Perfil de participante con nombre visible en tabla.
- Partidos de Colombia del Grupo K, con banderas, fecha, sede y estado.
- Prediccion de marcador por partido pendiente.
- Desplegables de goleadores segun la cantidad de goles ingresada.
- Partidos pasados con resultado y goleadores reales.
- Tabla de posiciones calculada en Supabase.
- Panel admin para cerrar/abrir partidos y finalizar resultados.

## Desarrollo local

1. Instala dependencias:

```bash
npm install
```

2. Copia variables:

```powershell
copy .env.example .env
```

3. Configura `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Levanta Vite:

```bash
npm run dev
```

## Supabase

Aplica la migracion:

```bash
supabase db push
```

La migracion `supabase/migrations/20260622000100_colombia_polla_supabase.sql` borra el esquema anterior de la app y crea:

- `profiles`
- `user_roles`
- `matches`
- `players`
- `predictions`
- `prediction_scorers`
- `match_scorers`

Tambien deja sembrados los partidos de Colombia:

- Uzbekistan vs Colombia, 17 de junio de 2026, finalizado 1-3.
- Colombia vs R. D. del Congo, 23 de junio de 2026, abierto.
- Colombia vs Portugal, 27 de junio de 2026, abierto.

Para convertir un usuario en admin, registra la cuenta en la app y luego ejecuta en Supabase SQL:

```sql
insert into public.user_roles (user_id, role)
values ('USER_ID_AQUI', 'admin')
on conflict (user_id, role) do nothing;

update public.profiles
set role = 'admin'
where id = 'USER_ID_AQUI';
```

## Vercel

Configura estas variables en el proyecto de Vercel:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Build command:

```bash
npm run build
```

Output directory:

```txt
dist
```
