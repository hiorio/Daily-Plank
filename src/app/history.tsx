import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing } from '../constants/theme';
import { getRecentWorkoutRecords } from '../database/workoutRecordRepository';
import { WorkoutRecord } from '../domain/workoutRecord';
import { calculateWorkoutStatistics } from '../services/statisticsService';
import { formatDurationKorean } from '../utils/duration';

export default function HistoryScreen() {
  const [records, setRecords] = useState<WorkoutRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getRecentWorkoutRecords(30)
        .then(setRecords)
        .catch((error) => {
          if (__DEV__) console.warn('History load failed', error);
          setRecords([]);
        });
    }, []),
  );

  const statistics = calculateWorkoutStatistics(records);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={records}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>운동 기록</Text>
            <View style={styles.statsRow}>
              <StatCard label="이번 주 횟수" value={`${statistics.weeklyWorkoutCount}회`} />
              <StatCard label="이번 주 누적" value={formatDurationKorean(statistics.weeklyDurationSeconds)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 기록이 없다.</Text>
            <Text style={styles.emptyText}>운동을 완료하거나 중간 종료하면 여기에 표시된다.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.record}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordTitle}>{item.sessionTitle}</Text>
              <Text style={[styles.status, item.status === 'CANCELLED' && styles.cancelled]}>
                {item.status === 'COMPLETED' ? '완료' : '취소'}
              </Text>
            </View>
            <Text style={styles.meta}>{new Date(item.startedAt).toLocaleString()}</Text>
            <Text style={styles.meta}>
              실제 {formatDurationKorean(item.actualDurationSeconds)} · 완료율{' '}
              {Math.round(item.completionRate)}%
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.muted, lineHeight: 20 },
  record: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  recordTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '900' },
  status: { color: colors.primaryDark, fontWeight: '900' },
  cancelled: { color: colors.danger },
  meta: { color: colors.muted },
});
