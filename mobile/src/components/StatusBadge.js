import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, radius } from '../theme';

const CONFIG = {
  synced: { color: colors.statusLowSynced, icon: 'cloud-check', label: 'Sinc.' },
  pending: { color: colors.statusMediumSync, icon: 'cloud-sync', label: 'Pend.' },
  error: { color: colors.statusHighError, icon: 'cloud-off-outline', label: 'Error' },
  draft: { color: colors.onSurfaceVariant, icon: 'file-document-edit-outline', label: 'Borrador' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '1A' }]}>
      <MaterialCommunityIcons name={cfg.icon} size={14} color={cfg.color} />
      <Text style={[typography.labelStatus, styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.DEFAULT,
  },
  label: {
    fontSize: 12,
  },
});
