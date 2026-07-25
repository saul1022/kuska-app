# Kuska Backend

Backend FastAPI de Kuska. Incluye los cuatro endpoints del contrato, CORS, Swagger,
persistencia en Supabase (Postgres + Storage) y clasificacion multimodal con Gemma 4.
El frontend (app movil y dashboard) vive en otro repositorio.

## Ejecutar localmente

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload
```

Copia `.env.example` a `.env` y completa las llaves. Para que Gemma clasifique de
verdad usa `INCIDENT_PROCESSOR=gemma`; con `mock` las respuestas son simuladas.

Abrir:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs
- Healthcheck: http://127.0.0.1:8000/health

## Pruebas y calidad

```powershell
python -m pytest
python -m ruff check .
```

## Endpoints

- `POST /incidents`: ingesta multipart de evidencia.
- `GET /incidents`: lista con filtros básicos.
- `GET /incidents/{id}`: detalle completo.
- `POST /sync/batch`: sincronización JSON idempotente de metadatos o evidencia ya subida.

## Contrato de sincronización offline

Los reportes con archivos locales se sincronizan individualmente mediante `POST /incidents`
como `multipart/form-data`. El móvil conserva el mismo `client_id` en cada reintento, por lo
que una pérdida de conexión no genera duplicados.

`POST /sync/batch` mantiene un cuerpo JSON estable:

```json
{
  "incidents": [
    {
      "client_id": "0f70a3f0-81a7-44da-bbcc-a54eb4a83d09",
      "description": "Una vía quedó bloqueada por escombros.",
      "lat": -12.065,
      "lon": -75.204,
      "created_at_client": "2026-07-25T12:30:00-05:00",
      "photo_urls": ["https://storage.example/incidents/photo.jpg"],
      "video_url": null
    }
  ]
}
```

Las referencias `local://` y `file://` no son válidas porque solo existen en el teléfono.
`photo_urls` y `video_url` se usan únicamente cuando los archivos ya tienen una URL HTTP
accesible. La respuesta conserva el orden del lote e incluye `client_id`, `incident_id`,
`status` y `created`.

## Estado del scaffold

Los archivos subidos se representan temporalmente por su nombre y los datos viven en
memoria. El siguiente paso es implementar adaptadores de Supabase Database y Storage
sin cambiar los modelos ni las rutas públicas.

## Procesador de incidentes

El backend permite seleccionar el procesador sin cambiar los endpoints:

```env
INCIDENT_PROCESSOR=mock
GEMINI_MODEL=gemma-4-31b-it
GEMINI_REVIEW_THRESHOLD=0.60
```

- `mock`: clasificación local y determinista, sin consumir cuota.
- `gemma`: descarga la evidencia privada desde Supabase Storage y usa Google Gen AI.

Para activar Gemma también se requiere `GEMINI_API_KEY`. Una confianza inferior a
`GEMINI_REVIEW_THRESHOLD` produce el estado `needs_review`; errores de red, autenticación,
descarga, respuesta vacía o JSON inválido producen `processing_failed`.

## Pruebas de integración

La suite normal no llama servicios externos:

```powershell
python -m pytest
```

Para verificar PostgreSQL y Storage reales, con creación y limpieza automática del dato:

```powershell
$env:RUN_SUPABASE_INTEGRATION="1"
python -m pytest tests/integration/test_supabase.py
```

La prueba real de Gemma consume cuota y requiere habilitación explícita adicional:

```powershell
$env:RUN_SUPABASE_INTEGRATION="1"
$env:RUN_GEMMA_INTEGRATION="1"
python -m pytest tests/integration/test_supabase.py
```

En producción configura `APP_ALLOWED_HOSTS`, `APP_CORS_ORIGINS` y
`APP_RATE_LIMIT_PER_MINUTE` con los dominios y límites reales del despliegue.
