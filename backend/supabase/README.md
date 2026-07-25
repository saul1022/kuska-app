# Supabase

## Aplicar la migración inicial

1. Abrir el proyecto en Supabase.
2. Entrar a **SQL Editor** y crear una consulta nueva.
3. Copiar el contenido de
   `migrations/202607250001_initial_schema.sql`.
4. Ejecutar la consulta una sola vez.

La migración es repetible: utiliza `if not exists` y actualiza la configuración del bucket
si ya existe.

## Resultado esperado

- Tabla `public.incidents` con `client_id` único.
- Tabla `public.incident_media` relacionada por `incident_id`.
- Índices para fecha, estado/prioridad, ubicación y evidencia.
- Row Level Security habilitado sin políticas públicas.
- Bucket privado `incident-evidence` limitado a 50 MB por archivo y formatos admitidos.

El backend usará la `service_role key`, que puede operar con RLS habilitado. Esa clave nunca
debe exponerse en mobile, dashboard ni archivos versionados.
