import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export function useLocationCapture() {
  const [status, setStatus] = useState('loading'); // loading | granted | denied | error
  const [coords, setCoords] = useState(null);

  const capture = useCallback(async () => {
    setStatus('loading');
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      setStatus('denied');
      return;
    }

    // En Android, pedir precisión alta puede tardar mucho esperando un fix
    // real de GPS. Mostramos primero la última ubicación conocida (si existe,
    // es casi instantánea) y refinamos en segundo plano con una lectura fresca
    // de precisión media (usa red/WiFi, mucho más rápida que GPS puro).
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        setCoords({
          lat: lastKnown.coords.latitude,
          lon: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy,
        });
        setStatus('granted');
      }
    } catch (e) {
      // Sin última posición conocida; seguimos con la lectura fresca de abajo.
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setStatus('granted');
    } catch (e) {
      setStatus((prev) => (prev === 'granted' ? prev : 'error'));
    }
  }, []);

  useEffect(() => {
    capture();
  }, [capture]);

  return { status, coords, retry: capture };
}
