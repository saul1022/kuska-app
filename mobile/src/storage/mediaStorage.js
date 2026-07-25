import * as FileSystem from 'expo-file-system';

const MEDIA_DIR = `${FileSystem.documentDirectory}kuska-media/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  }
}

/**
 * Copia un archivo capturado (foto/video, en cache temporal) a almacenamiento
 * persistente de la app para que sobreviva a cerrar/abrir la app.
 */
export async function persistMedia(uri, filename) {
  if (!uri) return null;
  await ensureDir();
  const dest = MEDIA_DIR + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
