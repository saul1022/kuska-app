# Kuska — Guía Backend (Hackathon "Build with Gemma" — GDG Callao)

> Este documento es la guía de trabajo del equipo backend y contiene el alcance necesario para comenzar la implementación.

## Contexto en una frase

Kuska recibe fotos/video/texto/GPS de un reporte ciudadano post-sismo, se lo pasa a **Gemma 4** (multimodal) para clasificarlo y priorizarlo, y expone esa información a una app móvil (offline-first) y a un dashboard web. Sprint de 1 día: 25 julio 2026, 08:30–16:30, envío a Kaggle a las 16:30 en punto.

## Equipo backend (2 personas)

- **Andre — IA, clasificación y procesamiento** (rama `andre`): integración con Gemma, prompt de clasificación estructurada, validación del JSON generado, cálculo de prioridad y servicio de procesamiento de incidentes.
- **Daniel — API, datos, sincronización y despliegue** (rama `daniel`): proyecto FastAPI, modelo de datos, Supabase/PostgreSQL, almacenamiento de evidencia, endpoints de ingesta y consulta, idempotencia por `client_id`, manejo de errores y deploy.

### División detallada

| Persona | Entregables principales | Criterio de terminado |
|---|---|---|
| Andre | Módulo cliente de Gemma, prompt versionado, esquema de respuesta, parser/validador, función de prioridad y casos de prueba con imágenes | Una función recibe evidencia y descripción y devuelve un `gemma_result` válido o un error controlado, sin depender de los endpoints HTTP |
| Daniel | Scaffold FastAPI, configuración y migración de datos, Storage, `POST /incidents`, `GET /incidents`, `GET /incidents/{id}`, sincronización idempotente, CORS, documentación Swagger y URL desplegada | Los endpoints funcionan primero con un procesador simulado y después aceptan el módulo real de Andre sin cambiar el contrato público |

### Punto de integración entre Daniel y Andre

Andre entregará a Daniel una función con una interfaz estable equivalente a:

```python
async def analyze_incident(
    media_paths: list[str],
    description: str,
) -> GemmaResult:
    ...
```

Daniel será responsable de invocarla después de guardar el reporte original y de persistir su resultado. Andre no modificará rutas, base de datos ni despliegue; Daniel no modificará prompts ni reglas internas de clasificación. Ambos acuerdan al inicio el esquema `GemmaResult` y usan ejemplos compartidos para probarlo.

Trabajen sobre ramas propias y hagan integraciones pequeñas y frecuentes a `main` o a una rama `dev` compartida. Eviten editar simultáneamente el mismo archivo: Daniel mantiene las rutas y configuración; Andre mantiene el módulo `services/gemma` y sus pruebas.

## Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| API | **Python 3.11 + FastAPI** | Async, scaffolding rápido, y el Gemma Cookbook oficial trae ejemplos en Python — menos fricción integrando el modelo. |
| Modelo | **Gemma 4 vía Google AI Studio (Gemini API)** | Inferencia en la nube, sin GPU local, tier gratuito generoso, multimodal (imagen+video+texto) en una sola llamada. |
| DB + Storage | **Supabase** (Postgres + Storage) | Setup en minutos, sin backend de auth que construir (no se pide auth compleja), soporta geodata y guardar fotos/video directo. |
| Deploy | **Railway o Render (free tier)** | URL pública estable para que el móvil y el dashboard no dependan del wifi del local. |
| Docs de API | **Swagger UI integrado de FastAPI** (`/docs`) | Se genera solo, sin escribir nada extra — permite probar cada endpoint (incluyendo subida de fotos multipart) desde el navegador. |

### Python + FastAPI vs. Java + Spring Boot — decisión

Para este sprint, **Python + FastAPI**, no Spring Boot. Razones concretas:

- **Setup**: FastAPI son minutos (`pip install`, un archivo `main.py`). Spring Boot implica JDK, Maven/Gradle, estructura de proyecto más pesada — tiempo que hoy no sobra.
- **Swagger gratis**: FastAPI genera la documentación interactiva (OpenAPI/Swagger) automáticamente a partir del código, sin dependencias extra. En Spring Boot hay que agregar y configurar `springdoc-openapi` a mano para tener lo mismo.
- **Gemma/Gemini SDK**: los ejemplos oficiales del Gemma Cookbook y del SDK de Google AI Studio están en Python — menos traducción, menos riesgo al integrar la parte más nueva del proyecto.
- Spring Boot gana en robustez/tipado para sistemas grandes de producción, pero eso no es lo que se juzga hoy — la rúbrica pesa funcionalidad y demo, no arquitectura enterprise.

Si alguien del equipo ya domina Node más que Python, Express+TypeScript es la única alternativa razonable (misma lógica: setup rápido) — Spring Boot no, salvo que ya tengan mucha experiencia previa con él específicamente.

### Swagger vs. Postman

No necesitan instalar ni configurar Swagger aparte: al correr FastAPI, entrando a `http://localhost:8000/docs` ya tienen una UI interactiva con todos los endpoints, incluida la subida de archivos (fotos/video) por multipart. Eso cubre el testing manual del día a día. Postman/Thunder Client solo suma valor si quieren **guardar una colección de requests reutilizable** para compartir con frontend (por ejemplo, para que el equipo de dashboard pruebe `GET /incidents` sin escribir código) — es un nice-to-have, no algo que tengan que montar hoy si el tiempo aprieta.

## Contrato de API (acordar esto en los primeros 30 minutos)

```
POST /incidents
  multipart/form-data:
    photos[]      : image files (1-N)
    video          : video file (opcional)
    description    : string
    lat, lon       : float
    client_id      : string (uuid generado en el móvil, para deduplicar en el sync)
    created_at_client : ISO 8601
  → 201 { incident_id, status: "processing" }

GET /incidents?status=&priority=&bbox=
  → 200 [{ id, lat, lon, priority, type, status, created_at, thumbnail_url }]

GET /incidents/{id}
  → 200 {
      id, description, photos[], video_url, lat, lon, created_at, status,
      gemma_result: {
        type, damage_level, trapped_people_possible,
        secondary_risks: [], priority: "alta"|"media"|"baja",
        explanation
      }
    }

POST /sync/batch
  body: [ { ...mismo payload que POST /incidents, client_id } ]
  → 200 [{ client_id, incident_id, status }]
  # Idempotente por client_id: si ya existe, no lo duplica.
```

Devuelvan siempre `client_id` en las respuestas de sync — es lo que el móvil usa para marcar localmente qué ya se subió.

## Prompt de Gemma (punto de partida)

Pídanle a Gemma que devuelva **JSON estricto** (no texto libre) para que el backend no tenga que parsear lenguaje natural:

```
Eres un sistema de apoyo a la respuesta ante desastres. Analiza la(s) foto(s)/video y la descripción
del ciudadano. Responde SOLO un JSON con este esquema exacto:
{
  "type": "colapso_estructural | grietas | incendio | persona_atrapada | via_bloqueada | otro",
  "damage_level": "leve | moderado | severo | critico",
  "trapped_people_possible": true | false,
  "secondary_risks": ["fuego", "gas", "cables_electricos", ...],
  "priority": "alta | media | baja",
  "explanation": "1-2 frases explicando el razonamiento, en español"
}
Descripción del ciudadano: "{description}"
```

Prueben esto aislado (script suelto o Google AI Studio / Colab) en la **primera hora** — es la pieza más nueva y riesgosa, y si el formato de salida falla, afecta a los 4.

### Sobre "agentes multimodales" de detección de imágenes

Si alguien les recomendó instalar un "agente multimodal que detecta imágenes" aparte: **no hace falta para el MVP**. Gemma 4 ya es multimodal — recibe la(s) foto(s)/video directamente en la misma llamada de la API junto con el texto, y devuelve la clasificación en un solo paso (el prompt de arriba). Un "agente" (framework con function calling / tool use que decide cuándo invocar qué) es una capa extra por encima de eso, pensada para flujos donde el modelo decide autónomamente qué herramientas llamar — útil recién si van a ir por el reconocimiento especial de **Autonomous Agent Excellence**, y solo como mejora *después* de tener el flujo básico (foto → Gemma → clasificación → guardado) funcionando de punta a punta. No instalen nada nuevo para esto todavía; primero validen la llamada directa a Gemma.

## Checklist de instalación del backend

1. **Cuenta Google AI Studio** → https://aistudio.google.com → generar API key para Gemini/Gemma. Probar con un `curl` simple antes de escribir código.
2. **Python 3.11+** — verificar con `python --version`. Si no está: instalar desde python.org (marcar "Add to PATH").
3. **VS Code** — ya lo tienes. Instalar extensión "Python" y "Thunder Client" (cliente REST integrado, evita instalar Postman aparte).
4. **Git** — usar las ramas `andre` y `daniel` según la responsabilidad asignada.
5. Crear entorno virtual y proyecto FastAPI:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install fastapi uvicorn python-multipart google-genai supabase
   ```
6. **Cuenta Supabase** → https://supabase.com → crear proyecto → copiar `URL` y `anon/service key` → crear bucket de Storage para fotos/video.
7. **ngrok** (opcional pero recomendado) → https://ngrok.com → para exponer tu backend local (`ngrok http 8000`) y que el celular con Expo Go pueda pegarle sin estar en la misma red. Alternativa: deployar temprano a Railway/Render y trabajar siempre contra esa URL.
8. **No necesitas** Android Studio, Xcode ni Docker para esta parte — son cosas de frontend/mobile o de infra que no aportan velocidad hoy.

## Fases (mismo esquema que usa el equipo frontend — ver [FRONTEND.md](./FRONTEND.md))

Trabajamos por **fases con criterio de salida**, no por bloques de reloj rígidos: si una fase se atrasa, se recorta alcance de esa fase, no se corre todo el cronograma. Las horas son referencia, no un límite duro.

- **Etapa 1 — Setup** (~08:30–09:00): contrato de API cerrado con el equipo, proyecto Supabase creado, API key de Gemini obtenida y probada con un `curl`/request suelto, scaffold FastAPI corriendo con los endpoints como stubs devolviendo mocks. *Salida: `GET /docs` de Swagger abre y muestra los 4 endpoints.*
- **Etapa 2 — Núcleo aislado** (~09:00–11:00): Andre prueba Gemma multimodal fuera del API hasta que el JSON de salida sea confiable. Daniel arma el esquema de datos y `/sync/batch` contra un procesador simulado. *Salida: una foto de prueba produce un JSON de clasificación válido, y `/sync/batch` guarda en Supabase.*
- **Etapa 3 — Integración real**: `/incidents` funcionando de punta a punta (foto real → Gemma real → guardado en DB), conectado con lo que frontend ya tiene mockeado.
- **Etapa 4 — Offline/Sync robusto**: idempotencia por `client_id`, reintentos, `/incidents/{id}` completo con el bloque `gemma_result` para el dashboard.
- **Etapa 5 — Deploy y pulido**: deploy a Railway/Render, manejo de errores, datos de demo sembrados.
- **Etapa 6 — Cierre**: Writeup de Kaggle, repo público, verificación final, envío antes de las 16:30 (con buffer, no al filo).

## Notas de negocio a no perder de vista

- Los resultados de Gemma son **apoyo**, no verdad absoluta — no hace falta lógica de "certeza garantizada".
- No hay que construir autenticación compleja (está explícitamente fuera de alcance).
- La app entregable apunta a Android, pero el **desarrollo** funciona igual en cualquier celular (Android o iPhone) gracias a Expo Go — ver la nota de plataforma en [FRONTEND.md](./FRONTEND.md). No es un bloqueante para nadie del equipo.
