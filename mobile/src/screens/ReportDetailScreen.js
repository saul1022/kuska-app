import { View, Text, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../theme';
import StatusBadge from '../components/StatusBadge';
import PrimaryButton from '../components/PrimaryButton';

const PRIORITY_COLOR = {
  alta: colors.statusHighError,
  media: colors.statusMediumSync,
  baja: colors.statusLowSynced,
};

function humanize(value) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function GemmaAnalysisSection({ report }) {
  if (report.status !== 'synced') {
    return (
      <View style={styles.gemmaBox}>
        <View style={styles.gemmaHeaderRow}>
          <MaterialCommunityIcons name="robot-outline" size={20} color={colors.onSurfaceVariant} />
          <Text style={[typography.headlineMd, styles.gemmaTitle]}>Análisis de Gemma</Text>
        </View>
        <Text style={[typography.bodyMd, styles.gemmaPending]}>
          {report.status === 'error'
            ? 'El envío falló, por eso todavía no hay análisis de la IA. Reintenta el envío.'
            : 'Este reporte aún no se ha sincronizado. El análisis de Gemma aparecerá aquí apenas se envíe.'}
        </Text>
      </View>
    );
  }

  const result = report.gemmaResult;
  if (!result) {
    return (
      <View style={styles.gemmaBox}>
        <View style={styles.gemmaHeaderRow}>
          <MaterialCommunityIcons name="robot-outline" size={20} color={colors.onSurfaceVariant} />
          <Text style={[typography.headlineMd, styles.gemmaTitle]}>Análisis de Gemma</Text>
        </View>
        <Text style={[typography.bodyMd, styles.gemmaPending]}>
          El reporte se sincronizó, pero todavía no se pudo traer el resultado del análisis.
        </Text>
      </View>
    );
  }

  const priorityColor = PRIORITY_COLOR[result.priority] ?? colors.onSurfaceVariant;

  return (
    <View style={styles.gemmaBox}>
      <View style={styles.gemmaHeaderRow}>
        <MaterialCommunityIcons name="robot-outline" size={20} color={colors.primary} />
        <Text style={[typography.headlineMd, styles.gemmaTitle]}>Análisis de Gemma</Text>
        <View style={[styles.priorityPill, { backgroundColor: priorityColor + '1A' }]}>
          <Text style={[typography.labelStatus, { color: priorityColor, fontSize: 12 }]}>
            Prioridad {humanize(result.priority)}
          </Text>
        </View>
      </View>

      <View style={styles.gemmaGrid}>
        <View style={styles.gemmaGridItem}>
          <Text style={[typography.labelStatus, styles.gemmaLabel]}>Tipo</Text>
          <Text style={[typography.bodyMd, styles.gemmaValue]}>{humanize(result.type)}</Text>
        </View>
        <View style={styles.gemmaGridItem}>
          <Text style={[typography.labelStatus, styles.gemmaLabel]}>Nivel de daño</Text>
          <Text style={[typography.bodyMd, styles.gemmaValue]}>{humanize(result.damage_level)}</Text>
        </View>
      </View>

      {result.trapped_people_possible ? (
        <View style={styles.warningRow}>
          <MaterialCommunityIcons name="alert" size={18} color={colors.statusHighError} />
          <Text style={[typography.bodyMd, { color: colors.statusHighError }]}>
            Posibles personas atrapadas
          </Text>
        </View>
      ) : null}

      {result.secondary_risks?.length ? (
        <View style={{ gap: 8 }}>
          <Text style={[typography.labelStatus, styles.gemmaLabel]}>Riesgos secundarios</Text>
          <View style={styles.chipRow}>
            {result.secondary_risks.map((risk) => (
              <View key={risk} style={styles.chip}>
                <Text style={[typography.labelStatus, styles.chipText]}>{humanize(risk)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <Text style={[typography.labelStatus, styles.gemmaLabel]}>Explicación</Text>
        <Text style={[typography.bodyMd, styles.gemmaExplanation]}>{result.explanation}</Text>
      </View>

      {typeof result.confidence === 'number' ? (
        <Text style={[typography.labelStatus, styles.confidenceText]}>
          Confianza: {Math.round(result.confidence * 100)}%
        </Text>
      ) : null}
    </View>
  );
}

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

        <GemmaAnalysisSection report={report} />

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
  gemmaBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceVariant,
    borderRadius: radius.xl,
    padding: 16,
    gap: 16,
    marginTop: 8,
  },
  gemmaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gemmaTitle: {
    color: colors.onSurface,
    flex: 1,
    fontSize: 18,
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.DEFAULT,
  },
  gemmaPending: {
    color: colors.onSurfaceVariant,
  },
  gemmaGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  gemmaGridItem: {
    gap: 4,
  },
  gemmaLabel: {
    color: colors.onSecondaryContainer,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  gemmaValue: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorContainer,
    padding: 10,
    borderRadius: radius.lg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  chipText: {
    color: colors.onSurface,
    fontSize: 12,
  },
  gemmaExplanation: {
    color: colors.onSurfaceVariant,
  },
  confidenceText: {
    color: colors.onSecondaryContainer,
    fontSize: 12,
  },
});
