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
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setStatus('granted');
    } catch (e) {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    capture();
  }, [capture]);

  return { status, coords, retry: capture };
}
