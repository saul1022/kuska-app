import { useEffect, useRef, useState } from 'react';
import { Modal, View, Pressable, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme';
import PrimaryButton from './PrimaryButton';

export default function CameraCaptureModal({ visible, mode, onClose, onCapture }) {
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  useEffect(() => {
    if (!visible) return;
    if (!permission?.granted) requestPermission();
    if (mode === 'video' && !micPermission?.granted) requestMicPermission();
  }, [visible, mode]);

  async function handleTakePicture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
    onCapture(photo.uri);
    onClose();
  }

  async function handleToggleRecording() {
    if (!cameraRef.current) return;
    if (isRecording) {
      cameraRef.current.stopRecording();
      return;
    }
    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 15 });
      if (video?.uri) {
        onCapture(video.uri);
        onClose();
      }
    } finally {
      setIsRecording(false);
    }
  }

  const needsPermission = !permission?.granted || (mode === 'video' && !micPermission?.granted);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {needsPermission ? (
          <SafeAreaView style={styles.permissionScreen}>
            <MaterialCommunityIcons
              name={mode === 'video' ? 'video' : 'camera'}
              size={48}
              color={colors.onSurface}
            />
            <Text style={[typography.headlineMd, styles.permissionTitle]}>
              Kuska necesita tu {mode === 'video' ? 'cámara y micrófono' : 'cámara'}
            </Text>
            <Text style={[typography.bodyMd, styles.permissionBody]}>
              Para registrar evidencia real del daño. Sin esto no podemos completar el reporte.
            </Text>
            <PrimaryButton
              label="Cancelar"
              variant="secondary"
              onPress={onClose}
            />
          </SafeAreaView>
        ) : (
          <>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode={mode === 'video' ? 'video' : 'picture'} />
            <SafeAreaView style={styles.controls} edges={['bottom']}>
              <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={28} color="#fff" />
              </Pressable>

              <Pressable
                onPress={mode === 'video' ? handleToggleRecording : handleTakePicture}
                style={[styles.shutter, isRecording && styles.shutterRecording]}
              />

              <Pressable
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                style={styles.flipButton}
                hitSlop={12}
              >
                <MaterialCommunityIcons name="camera-flip" size={26} color="#fff" />
              </Pressable>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  closeButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#fff',
    backgroundColor: colors.statusHighError,
  },
  shutterRecording: {
    backgroundColor: colors.statusHighError,
    borderColor: colors.statusHighError,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  permissionTitle: {
    color: colors.onSurface,
    textAlign: 'center',
  },
  permissionBody: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 16,
  },
});
