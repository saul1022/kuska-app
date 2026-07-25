import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getPendingReports, updateReportStatus, updateGemmaResult } from '../storage/db';
import { createIncident, getIncidentDetail } from '../api/incidents';

/**
 * Escucha la conexión de red y, apenas hay conectividad, intenta subir
 * los reportes pendientes/con error uno por uno (POST /incidents mockeado
 * hasta que el backend esté listo). Actualiza SQLite y notifica via onChange.
 */
export function useNetworkSync(onChange) {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    async function syncPending() {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const pending = getPendingReports();
        for (const row of pending) {
          try {
            const result = await createIncident({
              clientId: row.client_id,
              description: row.description,
              lat: row.lat,
              lon: row.lon,
              createdAtClient: row.created_at_client,
              photoUris: row.photo_uri ? [row.photo_uri] : [],
              videoUri: row.video_uri,
            });
            updateReportStatus(row.client_id, 'synced', result.incident_id);
            try {
              const detail = await getIncidentDetail(result.incident_id);
              if (detail?.gemma_result) {
                updateGemmaResult(row.client_id, detail.gemma_result);
              }
            } catch (e) {
              // El envío sí se sincronizó; el detalle del análisis se puede
              // reintentar más adelante.
            }
          } catch (e) {
            updateReportStatus(row.client_id, 'error', null);
          }
        }
        if (pending.length > 0) onChange();
      } finally {
        isSyncingRef.current = false;
      }
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncPending();
      }
    });

    // Intento inicial por si ya hay conexión al abrir la app.
    NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        syncPending();
      }
    });

    return () => unsubscribe();
  }, [onChange]);
}
