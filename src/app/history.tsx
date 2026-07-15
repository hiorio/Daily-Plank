import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing } from '../constants/theme';
import { getWorkoutRecordsBetween } from '../database/workoutRecordRepository';
import { WorkoutRecord } from '../domain/workoutRecord';
import { useWorkoutStatistics } from '../hooks/useWorkoutStatistics';
import {
  buildMonthlyWorkoutSummary,
  buildWeeklyWorkoutSummary,
  MonthlyWorkoutSummary,
  WorkoutDaySummary,
} from '../services/historySummaryService';
import { addLocalDays, addLocalMonths, startOfLocalMonth, startOfLocalWeek } from '../utils/date';
import { formatDurationKorean } from '../utils/duration';

type HistoryViewMode = 'week' | 'month';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export default function HistoryScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [viewMode, setViewMode] = useState<HistoryViewMode>('week');
  const [monthCursor, setMonthCursor] = useState(() => startOfLocalMonth(new Date()));
  const { statistics } = useWorkoutStatistics();

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      const rangeStart = viewMode === 'week' ? startOfLocalWeek(now) : startOfLocalMonth(monthCursor);
      const rangeEnd = viewMode === 'week' ? addLocalDays(rangeStart, 7) : addLocalMonths(rangeStart, 1);

      void getWorkoutRecordsBetween(rangeStart.toISOString(), rangeEnd.toISOString())
        .then(setRecords)
        .catch((error) => {
          if (__DEV__) console.warn('History load failed', error);
          setRecords([]);
        });
    }, [monthCursor, viewMode]),
  );

  const now = new Date();
  const weeklySummary = buildWeeklyWorkoutSummary(records, now);
  const monthlySummary = buildMonthlyWorkoutSummary(records, monthCursor, now);
  const periodWorkoutCount =
    viewMode === 'week' ? weeklySummary.totalCompletedCount : monthlySummary.totalCompletedCount;
  const periodDurationSeconds =
    viewMode === 'week' ? weeklySummary.totalDurationSeconds : monthlySummary.totalDurationSeconds;
  const monthLabel = formatMonthLabel(monthCursor);

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
            <View style={styles.streakCard}>
              <View style={styles.streakIcon}>
                <Text style={styles.streakIconText}>S</Text>
              </View>
              <View style={styles.streakText}>
                <Text style={styles.streakLabel}>연속 운동</Text>
                <Text style={styles.streakValue}>{statistics.streakDays}일 연속</Text>
              </View>
              <View style={styles.streakDots}>
                {Array.from({ length: 7 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.streakDot,
                      index < Math.min(statistics.streakDays, 7) && styles.streakDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.segmented}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setViewMode('week')}
                style={[styles.segmentButton, viewMode === 'week' && styles.segmentButtonActive]}
              >
                <Text style={[styles.segmentText, viewMode === 'week' && styles.segmentTextActive]}>주</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setViewMode('month')}
                style={[styles.segmentButton, viewMode === 'month' && styles.segmentButtonActive]}
              >
                <Text style={[styles.segmentText, viewMode === 'month' && styles.segmentTextActive]}>월</Text>
              </Pressable>
            </View>
            {viewMode === 'month' ? (
              <View style={styles.monthNav}>
                <Pressable
                  accessibilityLabel="이전 달"
                  onPress={() => setMonthCursor((current) => addLocalMonths(current, -1))}
                  style={styles.monthNavButton}
                >
                  <Text style={styles.monthNavText}>‹</Text>
                </Pressable>
                <Text style={styles.monthNavTitle}>{monthLabel}</Text>
                <Pressable
                  accessibilityLabel="다음 달"
                  onPress={() => setMonthCursor((current) => addLocalMonths(current, 1))}
                  style={styles.monthNavButton}
                >
                  <Text style={styles.monthNavText}>›</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.statsRow}>
              <StatCard label={viewMode === 'week' ? '이번 주 횟수' : '이번 달 횟수'} value={`${periodWorkoutCount}회`} />
              <StatCard
                label={viewMode === 'week' ? '이번 주 누적' : '이번 달 누적'}
                value={formatDurationKorean(periodDurationSeconds)}
              />
            </View>
            {viewMode === 'week' ? (
              <WeekSummaryCard days={weeklySummary.days} />
            ) : (
              <MonthSummaryCard summary={monthlySummary} />
            )}
            <Text style={styles.sectionTitle}>{viewMode === 'week' ? '이번 주 세션' : `${monthLabel} 세션`}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 기록이 없습니다.</Text>
            <Text style={styles.emptyText}>선택한 기간에 완료하거나 중간 종료한 운동이 여기에 표시됩니다.</Text>
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

function WeekSummaryCard({ days }: { days: WorkoutDaySummary[] }) {
  return (
    <View style={styles.periodCard}>
      <Text style={styles.periodTitle}>이번 주</Text>
      <View style={styles.weekDots}>
        {days.map((day, index) => (
          <View key={day.dateKey} style={styles.weekDay}>
            <View
              style={[
                styles.weekDot,
                day.completedCount > 0 && styles.weekDotActive,
                day.isToday && styles.weekDotToday,
              ]}
            >
              {day.completedCount > 0 ? (
                <Text style={styles.weekCheck}>{day.completedCount > 1 ? day.completedCount : '✓'}</Text>
              ) : null}
            </View>
            <Text style={[styles.weekLabel, day.completedCount > 0 && styles.weekLabelActive]}>
              {WEEKDAY_LABELS[index] ?? ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthSummaryCard({ summary }: { summary: MonthlyWorkoutSummary }) {
  const rows = chunkCalendarDays(summary.calendarDays);

  return (
    <View style={styles.periodCard}>
      <View style={styles.monthWeekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.monthWeekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {rows.map((row) => (
          <View key={row[0]?.dateKey ?? 'row'} style={styles.monthRow}>
            {row.map((day) => (
              <View
                key={day.dateKey}
                style={[
                  styles.monthCell,
                  !day.isCurrentMonth && styles.monthCellMuted,
                  day.isCurrentMonth && day.completedCount > 0 && styles.monthCellActive,
                  day.isToday && styles.monthCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.monthDayText,
                    !day.isCurrentMonth && styles.monthDayTextMuted,
                    day.isCurrentMonth && day.completedCount > 0 && styles.monthDayTextActive,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {day.isCurrentMonth && day.completedCount > 0 ? (
                  <Text style={styles.monthCountText}>{day.completedCount > 1 ? `${day.completedCount}회` : '완료'}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function chunkCalendarDays(days: WorkoutDaySummary[]): WorkoutDaySummary[][] {
  const rows: WorkoutDaySummary[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }
  return rows;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
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
  streakCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  streakIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakIconText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  streakText: { flex: 1 },
  streakLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '900' },
  streakValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: spacing.xs },
  streakDots: { flexDirection: 'row', gap: 5 },
  streakDot: {
    width: 14,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  streakDotActive: { backgroundColor: '#FFFFFF' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.md,
    padding: 4,
    gap: spacing.xs,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  segmentText: { color: colors.muted, fontSize: 15, fontWeight: '900' },
  segmentTextActive: { color: colors.primary },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  monthNavButton: {
    width: 44,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.mutedSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 30 },
  monthNavTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  periodCard: {
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
  periodTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
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
  weekDotToday: { borderWidth: 2, borderColor: colors.accent },
  weekCheck: { color: '#FFFFFF', fontWeight: '900' },
  weekLabel: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  weekLabelActive: { color: colors.primary },
  monthWeekdays: { flexDirection: 'row', justifyContent: 'space-between' },
  monthWeekday: {
    width: 42,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  monthGrid: { gap: spacing.sm },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between' },
  monthCell: {
    width: 42,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.mutedSurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  monthCellMuted: { opacity: 0.35 },
  monthCellActive: { backgroundColor: colors.primary },
  monthCellToday: { borderWidth: 2, borderColor: colors.accent },
  monthDayText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  monthDayTextMuted: { color: colors.muted },
  monthDayTextActive: { color: '#FFFFFF' },
  monthCountText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
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
