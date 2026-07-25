# Kuska Mobile — Brief de diseño (Google Stitch)

> Brief para generar el diseño UI de la app móvil Kuska en Google Stitch. Copiar/pegar las secciones relevantes como prompt.

## Contexto del producto

Kuska es una app móvil para que **ciudadanos reporten daños tras un sismo** mediante foto, video (opcional), descripción y ubicación GPS. La app es **offline-first**: el reporte se guarda localmente de inmediato y se sincroniza con el backend cuando hay conexión. No requiere login. Usuarios objetivo: personas comunes, en un contexto de emergencia, posiblemente con estrés, poca luz, conexión inestable o batería baja. La app debe transmitir **calma, claridad y confianza** — no parecer una app corporativa genérica ni una app "de juego".

## Tono visual

- Serio pero accesible, no alarmista.
- Alto contraste y texto grande — se usa en condiciones de estrés/poca luz.
- Colores: neutros (blancos/grises) como base, con un color de acento para estados de prioridad (usar semántica de semáforo: rojo/ámbar/verde) reservado solo para indicar estado de sincronización o severidad, no para decoración.
- Iconografía simple y reconocible (cámara, GPS, nube/sync, check).
- Tipografía legible a distancia, botones grandes (targets táctiles amplios, pensado para usarse con una mano o con nervios).

## Pantallas a diseñar

### 1. Pantalla de captura de reporte (pantalla principal)
- Botón grande y prominente para tomar **foto** (obligatoria).
- Opción secundaria para grabar **video corto** (opcional, claramente marcada como opcional).
- Campo de texto para **descripción** del incidente (placeholder con ejemplo: "Ej: edificio colapsado, hay personas atrapadas").
- Indicador de **GPS**: muestra que la ubicación se está capturando automáticamente (ícono + texto "Ubicación detectada" o "Buscando ubicación…"), sin pedir que el usuario la escriba.
- Botón principal **"Enviar reporte"** (grande, color de acento, ocupa el ancho).
- Estado sin conexión: un badge o banner discreto tipo "Sin conexión — tu reporte se guardará y enviará automáticamente" (no debe bloquear ni asustar).

### 2. Confirmación tras guardar
- Pantalla o modal breve confirmando "Reporte guardado" con un ícono de check.
- Mensaje claro: si no hay conexión, aclarar que se sincronizará solo cuando la haya.
- Botón para volver a la pantalla principal o ver "Mis reportes".

### 3. Mis reportes (lista)
- Lista de tarjetas, una por reporte, cada una con:
  - Miniatura de la foto.
  - Descripción corta (truncada).
  - Fecha/hora.
  - **Badge de estado**: Pendiente (gris/ámbar), Sincronizado (verde), Error (rojo) — con ícono distintivo, no solo color (accesibilidad).
- Pull-to-refresh o indicador de "sincronizando…" cuando el servicio de sync está corriendo.
- Estado vacío: mensaje amable tipo "Aún no has registrado reportes" con CTA para crear el primero.

### 4. Detalle de un reporte (opcional si da el tiempo)
- Foto/video en grande.
- Descripción completa.
- Mapa pequeño o coordenadas de la ubicación capturada.
- Estado de sincronización con opción de "Reintentar" si falló.

### 5. Permisos (cámara / ubicación)
- Pantallas de solicitud de permiso con explicación breve de por qué se necesita (no el diálogo nativo genérico): "Kuska necesita tu cámara para registrar evidencia del daño" / "Kuska necesita tu ubicación para marcar dónde ocurrió el incidente".

## Estados a contemplar en el diseño

- Con conexión / sin conexión (offline-first es el punto central del producto — debe notarse visualmente pero sin ser intrusivo).
- Reporte: pendiente → sincronizando → sincronizado / error.
- Carga (subiendo foto/video grande con conexión lenta).
- Error de envío con opción de reintentar.

## Fuera de alcance para este diseño

- Login / autenticación.
- Chat, panel de administración, historial complejo.
- Cualquier pantalla de operador/dashboard (eso es un proyecto web aparte).

## Plataforma

- Mobile-first, formato vertical (portrait), pensado para Android (también debe verse bien en iPhone vía Expo Go, mismo diseño).
- Diseñar para una sola mano cuando sea posible (botones principales alcanzables con el pulgar).

## Entregable esperado de Stitch

- Wireframes/mockups de las pantallas 1 a 3 (prioritarias), estilo limpio, componentes reutilizables (tarjeta de reporte, badge de estado, botón primario/secundario).
- Paleta de colores y tipografía sugerida, exportable para implementar en React Native (Expo).
