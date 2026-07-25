# Kuska

Plataforma de apoyo a la respuesta ante desastres sísmicos. Los ciudadanos reportan daños
(foto/video/texto/GPS) desde una app móvil offline-first; el backend clasifica cada reporte
con **Gemma 4** y expone la información priorizada. Ver [Alcance del sistema](docs/Alcance.md).

## Estructura

- [`mobile/`](mobile/) — App móvil (Expo / React Native). Captura de reportes, cola offline-first
  (SQLite + FileSystem), sincronización automática. Ver [mobile/DISENO_STITCH.md](mobile/DISENO_STITCH.md).
- [`backend/`](backend/) — API (FastAPI + Supabase + Gemma 4). Ver [backend/README.md](backend/README.md).

## Levantar todo en local

### Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload
```
Swagger: http://127.0.0.1:8000/docs

### Móvil
```bash
cd mobile
npm install
npx expo start
```
Escanea el QR con Expo Go. Actualiza `mobile/src/api/config.js` (`API_BASE_URL`, `MOCK_API = false`)
para apuntar al backend real una vez que esté corriendo.

## Contrato de API

Ver [docs/FRONTEND.md](docs/FRONTEND.md) y [backend/README.md](backend/README.md) para el
contrato completo de `POST /incidents`, `GET /incidents`, `GET /incidents/{id}` y `POST /sync/batch`.
