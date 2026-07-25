import { View, Text, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../theme';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';

export default function ReportDetailScreen({ route, navigation, reports, onRetry }) {
  const { reportId } = route.params ?? {};
  const report = reports.find((r) => r.id === reportId);

  if (!report) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.empty}>
          <Text style={[typography.bodyMd, styles.emptyText]}>
            Este reporte ya no está disponible.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[typography.headlineMd, styles.headerTitle]}>Detalle del Reporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {report.imageUrl ? (
          <Image source={{ uri: report.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <MaterialCommunityIcons name="image-off-outline" size={40} color={colors.onSurfaceVariant} />
          </View>
        )}

        {report.videoUri ? (
          <View style={styles.videoBadge}>
            <MaterialCommunityIcons name="video" size={18} color={colors.onSurfaceVariant} />
            <Text style={[typography.labelStatus, styles.videoBadgeText]}>
              Incluye video adjunto
            </Text>
          </View>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={[typography.headlineLg, styles.title]}>{report.title}</Text>
          <StatusBadge status={report.status} />
        </View>

        <Text style={[typography.bodyLg, styles.description]}>{report.description}</Text>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="calendar" size={18} color={colors.onSurfaceVariant} />
          <Text style={[typography.labelStatus, styles.metaText]}>{report.date}</Text>
        </View>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="map-marker" size={18} color={colors.onSurfaceVariant} />
          <Text style={[typography.labelStatus, styles.metaText]}>{report.location}</Text>
        </View>

        {report.status === 'error' ? (
          <View style={{ marginTop: 24 }}>
            <PrimaryButton
              label="Reintentar envío"
              icon="refresh"
              onPress={() => onRetry?.(report.id)}
            />
          </View>
        ) : null}
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.marginMobile,
    backgroundColor: colors.backgroundSurface,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    padding: spacing.marginMobile,
    gap: 16,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceContainer,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoBadgeText: {
    color: colors.onSurfaceVariant,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  title: {
    flex: 1,
    color: colors.onSurface,
  },
  description: {
    color: colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: colors.onSecondaryContainer,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
