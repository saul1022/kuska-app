import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../theme';
import ReportCard from '../components/ReportCard';

export default function MisReportesScreen({ reports, onRetry, navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="menu" size={24} color={colors.primary} />
          <Text style={[typography.headlineMd, styles.headerTitle]}>Kuska</Text>
        </View>
      </View>

      <View style={styles.onlineBar}>
        <MaterialCommunityIcons name="wifi" size={16} color={colors.statusLowSynced} />
        <Text style={[typography.labelStatus, styles.onlineText]}>En línea</Text>
      </View>

      {reports.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={colors.onSurfaceVariant} />
          <Text style={[typography.bodyMd, styles.emptyText]}>
            Aún no has registrado reportes.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={[typography.headlineLg, styles.listTitle]}>Mis Reportes</Text>
          }
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              onPress={() => navigation.navigate('ReporteDetalle', { reportId: item.id })}
              onRetry={() => onRetry?.(item.id)}
            />
          )}
        />
      )}
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
    justifyContent: 'center',
    paddingHorizontal: spacing.marginMobile,
    backgroundColor: colors.backgroundSurface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    color: colors.primary,
    fontWeight: '700',
  },
  onlineBar: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.statusLowSynced + '1A',
  },
  onlineText: {
    color: colors.statusLowSynced,
    textTransform: 'uppercase',
  },
  list: {
    padding: spacing.marginMobile,
  },
  listTitle: {
    color: colors.onSurface,
    marginBottom: 24,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
