import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, radius } from '../theme';
import PrimaryButton from '../components/PrimaryButton';
import CameraCaptureModal from '../components/CameraCaptureModal';
import { useLocationCapture } from '../hooks/useLocationCapture';

export default function CapturaScreen({ navigation, onSubmit }) {
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [captureMode, setCaptureMode] = useState(null); // 'photo' | 'video' | null
  const [submitting, setSubmitting] = useState(false);

  const location = useLocationCapture();

  const canSubmit =
    Boolean(photoUri) && description.trim().length >= 10 && location.status === 'granted';

  async function pickFromGallery(kind) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    if (kind === 'video') {
      setVideoUri(uri);
    } else {
      setPhotoUri(uri);
    }
  }

  async function handleSubmit() {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        description,
        photoUri,
        videoUri,
        location: location.coords,
      });
      setDescription('');
      setPhotoUri(null);
      setVideoUri(null);
      navigation.navigate('ReporteGuardado');
    } catch (e) {
      Alert.alert(
        'No se pudo guardar el reporte',
        e?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={[typography.headlineMd, styles.headerTitle]}>Kuska</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Text style={[typography.headlineLg, styles.title]}>Nuevo Reporte</Text>
          <Text style={[typography.bodyMd, styles.subtitle]}>
            Captura la evidencia del incidente con la mayor claridad posible.
          </Text>
        </View>

        <View style={styles.mediaRow}>
          <View style={{ flex: 1, gap: 8 }}>
            <Pressable
              onPress={() => setCaptureMode('photo')}
              style={[styles.mediaButton, photoUri && styles.mediaButtonActive]}
            >
              <Text style={[typography.labelStatus, styles.reqBadge]}>Req</Text>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
              ) : (
                <>
                  <View style={styles.mediaIconWrap}>
                    <MaterialCommunityIcons name="camera" size={32} color={colors.primary} />
                  </View>
                  <Text style={[typography.buttonText, styles.mediaLabel]}>Tomar Foto</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={() => pickFromGallery('photo')} style={styles.galleryLink}>
              <MaterialCommunityIcons name="image-multiple-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={[typography.labelStatus, styles.galleryLinkText]}>Elegir de galería</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1, gap: 8 }}>
            <Pressable
              onPress={() => setCaptureMode('video')}
              style={[styles.mediaButton, styles.mediaButtonSecondary, videoUri && styles.mediaButtonActive]}
            >
              <Text style={[typography.labelStatus, styles.optBadge]}>Opc</Text>
              {videoUri ? (
                <View style={styles.mediaIconWrapSecondary}>
                  <MaterialCommunityIcons name="video-check" size={32} color={colors.statusLowSynced} />
                </View>
              ) : (
                <View style={styles.mediaIconWrapSecondary}>
                  <MaterialCommunityIcons name="video" size={32} color={colors.secondary} />
                </View>
              )}
              <Text style={[typography.buttonText, styles.mediaLabelSecondary]}>
                {videoUri ? 'Video listo' : 'Grabar Video'}
              </Text>
            </Pressable>
            <Pressable onPress={() => pickFromGallery('video')} style={styles.galleryLink}>
              <MaterialCommunityIcons name="image-multiple-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={[typography.labelStatus, styles.galleryLinkText]}>Elegir de galería</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={[typography.bodyMd, styles.fieldLabel]}>Descripción detallada</Text>
          <TextInput
            style={styles.textarea}
            multiline
            numberOfLines={4}
            placeholder="Describe qué ocurrió, magnitud de daños o detalles relevantes del entorno..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <Pressable
          onPress={location.status === 'granted' ? undefined : location.retry}
          style={styles.locationBox}
        >
          <MaterialCommunityIcons
            name={location.status === 'granted' ? 'map-marker-check' : 'map-marker'}
            size={22}
            color={location.status === 'error' || location.status === 'denied' ? colors.statusHighError : colors.onSurfaceVariant}
          />
          <View style={{ flex: 1 }}>
            <Text style={[typography.labelStatus, styles.locationTitle]}>
              Ubicación GPS (Automática)
            </Text>
            <Text style={[typography.bodyMd, styles.locationSubtitle]}>
              {location.status === 'loading' && 'Buscando ubicación…'}
              {location.status === 'granted' &&
                `Lat ${location.coords.lat.toFixed(5)}, Lon ${location.coords.lon.toFixed(5)} · Precisión ${Math.round(location.coords.accuracy)}m`}
              {location.status === 'denied' && 'Permiso denegado — toca para reintentar'}
              {location.status === 'error' && 'No se pudo obtener ubicación — toca para reintentar'}
            </Text>
          </View>
        </Pressable>

        <View style={{ marginTop: 16, gap: 8 }}>
          {!canSubmit && !submitting ? (
            <Text style={[typography.labelStatus, styles.hint]}>
              Falta: {!photoUri && 'foto'}
              {!photoUri && description.trim().length < 10 && ', '}
              {description.trim().length < 10 && 'descripción de al menos 10 caracteres'}
              {(!photoUri || description.trim().length < 10) && location.status !== 'granted' && ', '}
              {location.status !== 'granted' && 'ubicación GPS'}
            </Text>
          ) : null}
          <PrimaryButton
            label={submitting ? 'Enviando…' : 'Enviar Reporte'}
            icon="send"
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          />
        </View>
      </ScrollView>

      <CameraCaptureModal
        visible={captureMode !== null}
        mode={captureMode ?? 'photo'}
        onClose={() => setCaptureMode(null)}
        onCapture={(uri) => {
          if (captureMode === 'video') {
            setVideoUri(uri);
          } else {
            setPhotoUri(uri);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: spacing.touchTargetMin,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSurface,
  },
  headerTitle: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    padding: spacing.marginMobile,
    gap: 32,
  },
  title: {
    color: colors.onSurface,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: spacing.gutter,
  },
  mediaButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  mediaButtonSecondary: {
    backgroundColor: colors.surface,
  },
  mediaButtonActive: {
    borderColor: colors.statusLowSynced,
  },
  galleryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  galleryLinkText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  reqBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.errorContainer,
    color: colors.onErrorContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.DEFAULT,
    fontSize: 12,
    zIndex: 1,
  },
  optBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.surfaceVariant,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.DEFAULT,
    fontSize: 12,
    zIndex: 1,
  },
  mediaIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaIconWrapSecondary: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLabel: {
    color: colors.onSurface,
  },
  mediaLabelSecondary: {
    color: colors.secondary,
  },
  fieldLabel: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  textarea: {
    width: '100%',
    minHeight: 110,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    padding: 16,
    fontSize: 16,
    color: colors.onSurface,
    textAlignVertical: 'top',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    borderRadius: radius.lg,
    padding: 16,
  },
  locationTitle: {
    color: colors.onSurface,
    fontSize: 14,
  },
  locationSubtitle: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  hint: {
    color: colors.statusHighError,
    fontSize: 12,
  },
});
