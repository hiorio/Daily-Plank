import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing } from '../constants/theme';
import { getRecentWorkoutRecords } from '../database/workoutRecordRepository';
import { WorkoutRecord } from '../domain/workoutRecord';
import { calculateWorkoutStatistics } from '../services/statisticsService';
import { formatDurationKorean } from '../utils/duration';

export default function HistoryScreen() {
  const router = useRouter();
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
  const activeDays = Math.min(statistics.weeklyWorkoutCount, 7);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={records}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.header}>
              <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={styles.backButton}>
                <Text style={styles.backText}>‹</Text>
              </Pressable>
              <View>
                <Text style={styles.eyebrow}>HISTORY</Text>
                <Text style={styles.title}>운동 기록</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <StatCard label="이번 주 횟수" value={`${statistics.weeklyWorkoutCount}회`} />
              <StatCard label="이번 주 누적" value={formatDurationKorean(statistics.weeklyDurationSeconds)} />
            </View>
            <View style={styles.weekCard}>
              <Text style={styles.weekTitle}>이번 주</Text>
              <View style={styles.weekDots}>
                {Array.from({ length: 7 }).map((_, index) => (
                  <View key={index} style={styles.weekDay}>
                    <View style={[styles.weekDot, index < activeDays && styles.weekDotActive]}>
                      {index < activeDays ? <Text style={styles.weekCheck}>✓</Text> : null}
                    </View>
                    <Text style={[styles.weekLabel, index < activeDays && styles.weekLabelActive]}>
                      {['월', '화', '수', '목', '금', '토', '일'][index]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.sectionTitle}>최근 세션</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 기록이 없습니다.</Text>
            <Text style={styles.emptyText}>운동을 완료하거나 중간 종료하면 여기에 표시됩니다.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.record}>
            <View style={styles.recordIcon}>
              <Text style={styles.recordIconText}>{item.status === 'COMPLETED' ? '✓' : '!'}</Text>
            </View>
            <View style={styles.recordBody}>
              <View style={styles.recordHeader}>
                <Text numberOfLines={1} style={styles.recordTitle}>
                  {item.sessionTitle}
                </Text>
                <Text style={[styles.status, item.status === 'CANCELLED' && styles.cancelled]}>
                  {item.status === 'COMPLETED' ? '완료' : '취소'}
                </Text>
              </View>
              <Text style={styles.meta}>{new Date(item.startedAt).toLocaleString()}</Text>
              <Text style={styles.meta}>
                실제 {formatDurationKorean(item.actualDurationSeconds)} · 완료율 {Math.round(item.completionRate)}%
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, item.completionRate))}%` }]} />
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerWrap: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 30 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  weekCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  weekTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  weekDots: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  weekDay: { alignItems: 'center', gap: spacing.sm },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: colors.mutedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotActive: { backgroundColor: colors.primary },
  weekCheck: { color: '#FFFFFF', fontWeight: '900' },
  weekLabel: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  weekLabelActive: { color: colors.primary },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.muted, lineHeight: 20 },
  record: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    flexDirection: 'row',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  recordIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordIconText: { color: colors.primary, fontWeight: '900' },
  recordBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  recordTitle: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '900' },
  status: { color: colors.primary, fontWeight: '900' },
  cancelled: { color: colors.danger },
  meta: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  progressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.mutedSurface,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
});
