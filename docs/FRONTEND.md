# Kuska — Guía Frontend (Hackathon "Build with Gemma" — GDG Callao)

> Este documento es la guía de trabajo del equipo frontend y contiene el alcance necesario para comenzar la implementación.

## Contexto en una frase

Kuska recibe fotos/video/texto/GPS de un reporte ciudadano post-sismo, el backend se lo pasa a **Gemma 4** para clasificarlo y priorizarlo, y esa información se muestra en una app móvil (offline-first, para capturar reportes) y un dashboard web (para que un operador vea el mapa de incidentes). Sprint de 1 día: 25 julio 2026, 08:30–16:30, envío a Kaggle a las 16:30 en punto.

## Equipo frontend (2 personas)

- **Saul — Aplicación móvil** (rama `saul`): captura de foto/video/texto/GPS, persistencia local, listado de reportes y cola de sincronización offline-first.
- **Lucas — Dashboard web** (rama `lucas`): mapa de incidentes, lista priorizada, vista de detalle, visualización de evidencia y explicación de Gemma.

### División detallada

| Persona | Entregables principales | Criterio de terminado |
|---|---|---|
| Saul | Proyecto Expo, permisos de cámara y ubicación, formulario de reporte, UUID, archivos locales, SQLite, estados pendiente/sincronizado/error, reintento y cliente de `POST /incidents` o `/sync/batch` | En modo avión se puede crear un reporte, cerrar y abrir la aplicación sin perderlo; al recuperar conexión se sincroniza sin duplicarlo |
| Lucas | Proyecto Next.js, datos simulados, mapa Leaflet, pines por prioridad, lista ordenada, detalle del incidente, estados de carga/error y deploy en Vercel | Desde una URL pública se puede recorrer la lista, seleccionar un incidente y ver su ubicación, evidencia y resultado de Gemma |

### Punto de integración entre Saul y Lucas

Saul y Lucas compartirán únicamente los tipos del contrato HTTP y la URL base del backend. Cada uno mantendrá su proyecto separado (`kuska-mobile` y `kuska-dashboard`) para evitar conflictos. Lucas puede comenzar con respuestas simuladas de los endpoints `GET`; Saul puede comenzar guardando localmente y simulando la respuesta del endpoint `POST`.

Saul coordinará con Daniel el envío multipart, el uso de `client_id` y la sincronización. Lucas coordinará con Daniel los endpoints de lista y detalle, y con Andre la presentación exacta de `gemma_result`.

Trabajen en ramas propias y hagan integraciones pequeñas y frecuentes. Los cambios al contrato API deben acordarse entre los cuatro y actualizarse en `BACKEND.md` y `FRONTEND.md` en el mismo momento.

## Stack recomendado

| Capa | Elección | Por qué |
|---|---|---|
| App móvil | **React Native + Expo** (managed workflow) | Se prueba en un celular real con la app **Expo Go** escaneando un QR — **no necesitas instalar Android Studio ni emulador**. Tiene módulos listos para cámara, video, GPS y storage local. |
| Dashboard | **Next.js + React** | Deploy gratis e instantáneo en Vercel, requisito del hackathon es demo pública sin login. |
| Mapa | **Leaflet** (react-leaflet) con OpenStreetMap | Gratis, sin API key, suficiente para un mapa de pines con prioridad por color. |

### Nota sobre iPhones en el equipo

El Alcance excluye explícitamente "Aplicación para iOS" como *entregable* (no van a publicar en App Store ni certificar esa versión). Eso **no** les impide desarrollar y probar con iPhone: la app **Expo Go** existe también para iOS (App Store), y con el managed workflow de Expo el mismo código corre igual en Android y iPhone durante el desarrollo — no hace falta Mac ni Xcode para nada de esto. Si dos del equipo tienen iPhone, usan Expo Go en su iPhone sin problema para programar y probar; simplemente el foco del entregable/demo final queda en que funcione (aunque en la práctica funcionará en ambos).

## Contrato de API (el mismo que usa el equipo de backend)

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
```

Mientras el backend no esté listo, **no esperen** — mockeen estas respuestas con datos falsos y avancen la UI en paralelo. Cambien la URL base a la real apenas el equipo de backend deploye.

## App móvil — qué construir

1. Pantalla de captura: cámara (foto obligatoria, video opcional), campo de texto para descripción, GPS automático (pedir permiso de ubicación).
2. Guardar el reporte **localmente primero** (no bloquear al usuario esperando red) — usar `expo-file-system` para los archivos y `expo-sqlite` o `AsyncStorage` para la cola de reportes pendientes.
3. Servicio de sync: cuando detecte conexión (`@react-native-community/netinfo`), sube los reportes pendientes vía `POST /sync/batch` y marca como sincronizados los que el backend confirme.
4. Pantalla simple de "mis reportes" con estado (pendiente / sincronizado / procesado).

## Dashboard — qué construir

1. Mapa con pines de incidentes (color por prioridad: rojo=alta, amarillo=media, verde=baja), usando `GET /incidents`.
2. Lista lateral ordenada por prioridad.
3. Vista de detalle al hacer click en un incidente: fotos/video, descripción, y el bloque `gemma_result` (tipo, nivel de daño, riesgos, explicación).
4. Nada de login — es explícitamente parte del alcance no tener auth compleja.

## Checklist de instalación

### Para Saul — app móvil
1. **Node.js LTS** (v20+) → https://nodejs.org
2. Instalar Expo CLI (no requiere instalación global, se usa con `npx`):
   ```bash
   npx create-expo-app kuska-mobile
   cd kuska-mobile
   npx expo install expo-camera expo-location expo-file-system expo-sqlite
   ```
3. Instalar la app **Expo Go** en tu celular (Play Store) — al correr `npx expo start` aparece un QR, lo escaneas y la app corre en tu teléfono real, en vivo.
4. **No necesitas Android Studio** salvo que al final quieran generar un `.apk` instalable para la demo — eso se hace con `eas build` (Expo Application Services) sin instalar nada pesado localmente. Para la demo del día, correr vía Expo Go o grabar un video es suficiente y más rápido.

### Para Lucas — dashboard
1. **Node.js LTS** (v20+) — mismo que arriba.
2. ```bash
   npx create-next-app@latest kuska-dashboard
   cd kuska-dashboard
   npm install leaflet react-leaflet
   ```
3. Cuenta en **Vercel** (vercel.com, login con GitHub) para deployar con un click y tener URL pública — requisito del hackathon.

## Fases (mismo esquema que usa el equipo backend — ver [BACKEND.md](./BACKEND.md))

Trabajamos por **fases con criterio de salida**, no por bloques de reloj rígidos: si una fase se atrasa, se recorta alcance de esa fase, no se corre todo el cronograma. Las horas son referencia, no un límite duro.

- **Etapa 1 — Setup** (~08:30–09:00): contrato de API cerrado con backend, `npx create-expo-app` y `npx create-next-app` corriendo, celulares (Android o iPhone) con Expo Go instalado y mostrando el QR de arranque. *Salida: ambos proyectos corren localmente sin errores.*
- **Etapa 2 — UI con mocks** (~09:00–11:00): pantalla de captura (móvil) y mapa+lista (dashboard) construidos contra datos falsos, sin depender de que backend ya esté listo. *Salida: se puede navegar el flujo completo con datos de mentira.*
- **Etapa 3 — Integración real**: conectar a `POST /incidents` y `GET /incidents` reales, apenas backend los tenga corriendo (local o deployado).
- **Etapa 4 — Offline-first real**: cola local en el móvil + sync automático al recuperar conexión; dashboard con vista de detalle completa (`gemma_result`).
- **Etapa 5 — Pulido y deploy**: manejo de estados de carga/error, deploy del dashboard a Vercel (URL pública sin login), probar el flujo completo dos veces.
- **Etapa 6 — Cierre**: grabar video de respaldo de la app móvil funcionando, confirmar que los links del Writeup de Kaggle funcionan sin login, antes de las 16:30.

## Notas de negocio a no perder de vista

- **Offline-first no es opcional** — es uno de los 6 puntos del "resultado esperado" del proyecto: debe poder registrar un incidente sin conexión y sincronizar después.
- No hay que construir autenticación compleja (fuera de alcance).
- El entregable apunta a Android, pero desarrollar/probar en iPhone con Expo Go funciona igual — ver la nota de plataforma arriba.
