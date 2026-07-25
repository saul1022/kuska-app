import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, radius } from '../theme';
import StatusBadge from './StatusBadge';

export default function ReportCard({ report, onPress, onRetry }) {
  const isError = report.status === 'error';
  const isDraft = report.status === 'draft';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isError && styles.cardError,
        isDraft && styles.cardDraft,
        pressed && { opacity: 0.9 },
      ]}
    >
      {isError ? <View style={styles.errorStripe} /> : null}

      <View style={styles.thumb}>
        {report.imageUrl ? (
          <Image
            source={{ uri: report.imageUrl }}
            style={[StyleSheet.absoluteFill, isError && styles.thumbError]}
          />
        ) : (
          <MaterialCommunityIcons
            name="image-plus"
            size={36}
            color={colors.onSecondaryContainer}
            style={{ opacity: 0.5 }}
          />
        )}
      </View>

      <View style={styles.body}>
        <View>
          <View style={styles.titleRow}>
            <Text
              style={[
                typography.bodyLg,
                styles.title,
                isDraft && styles.titleDraft,
              ]}
              numberOfLines={1}
            >
              {report.title}
            </Text>
            <StatusBadge status={report.status} />
          </View>
          <Text style={[typography.bodyMd, styles.description]} numberOfLines={2}>
            {report.description}
          </Text>
        </View>

        <View style={[styles.footer, isError && styles.footerError]}>
          {isError ? (
            <Pressable onPress={onRetry} style={styles.retryButton} hitSlop={8}>
              <MaterialCommunityIcons name="refresh" size={18} color={colors.statusHighError} />
              <Text style={[typography.buttonText, styles.retryText]}>Reintentar</Text>
            </Pressable>
          ) : (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar" size={16} color={colors.onSecondaryContainer} />
              <Text style={[typography.labelStatus, styles.meta]}>{report.date}</Text>
            </View>
          )}

          {isDraft ? (
            <View style={styles.metaRow}>
              <Text style={[typography.buttonText, styles.continueText]}>Continuar</Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color={colors.primary} />
            </View>
          ) : (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={16}
                color={isError ? colors.statusHighError : colors.onSecondaryContainer}
              />
              <Text
                style={[
                  typography.labelStatus,
                  styles.meta,
                  isError && { color: colors.statusHighError },
                ]}
              >
                {report.location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardError: {
    borderColor: colors.statusHighError + '4D',
  },
  cardDraft: {
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
  },
  errorStripe: {
    width: 4,
    backgroundColor: colors.statusHighError,
  },
  thumb: {
    width: 110,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbError: {
    opacity: 0.8,
  },
  body: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    color: colors.onSurface,
  },
  titleDraft: {
    fontStyle: 'italic',
    color: colors.onSurfaceVariant,
  },
  description: {
    color: colors.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceVariant,
    paddingTop: 10,
  },
  footerError: {
    borderTopColor: colors.statusHighError + '33',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: colors.onSecondaryContainer,
    fontSize: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryText: {
    color: colors.statusHighError,
    fontSize: 14,
  },
  continueText: {
    color: colors.primary,
    fontSize: 14,
  },
});
