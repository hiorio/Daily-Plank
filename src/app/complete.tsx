import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '../components/StatCard';
import { colors, radius, spacing } from '../constants/theme';
import { getWorkoutRecordById } from '../database/workoutRecordRepository';
import { WorkoutRecord } from '../domain/workoutRecord';
import { useWorkoutStatistics } from '../hooks/useWorkoutStatistics';
import { formatDurationKorean } from '../utils/duration';

export default function CompleteScreen() {
  const router = useRouter();
  const { recordId, sessionId } = useLocalSearchParams<{ recordId?: string; sessionId?: string }>();
  const [record, setRecord] = useState<WorkoutRecord | null>(null);
  const { statistics } = useWorkoutStatistics();

  useEffect(() => {
    if (!recordId) return;
    void getWorkoutRecordById(recordId).then(setRecord);
  }, [recordId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓</Text>
          </View>
          <Text style={styles.title}>세션이 완료됐습니다.</Text>
          <Text style={styles.subtitle}>{record?.sessionTitle ?? '운동 기록을 불러오는 중'}</Text>
        </View>

        <View style={styles.grid}>
          <StatCard label="계획 시간" value={formatDurationKorean(record?.plannedDurationSeconds ?? 0)} />
          <StatCard label="실제 시간" value={formatDurationKorean(record?.actualDurationSeconds ?? 0)} />
        </View>
        <View style={styles.grid}>
          <StatCard label="완료율" value={`${Math.round(record?.completionRate ?? 0)}%`} />
          <StatCard label="건너뛴 동작" value={`${record?.skippedStepCount ?? 0}개`} />
        </View>

        <View style={styles.recordCard}>
          <Text style={styles.recordEyebrow}>TODAY</Text>
          <View style={styles.recordHeader}>
            <View style={styles.recordText}>
              <Text style={styles.recordTitle}>{record?.sessionTitle ?? '오늘의 운동'}</Text>
              <Text style={styles.recordMeta}>이번 주 누적 {formatDurationKorean(statistics.weeklyDurationSeconds)}</Text>
            </View>
            <Text style={styles.recordRate}>{Math.round(record?.completionRate ?? 0)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(100, record?.completionRate ?? 0))}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
            <Text style={styles.primaryText}>홈으로 이동</Text>
          </Pressable>
          {sessionId ? (
            <Pressable onPress={() => router.replace(`/workout/${sessionId}`)} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>같은 세션 다시 시작</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
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
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 32 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
  grid: { flexDirection: 'row', gap: spacing.md },
  recordCard: {
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
  recordEyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  recordText: { flex: 1, minWidth: 0 },
  recordTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  recordMeta: { color: colors.muted, marginTop: spacing.xs, fontWeight: '700' },
  recordRate: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: colors.mutedSurface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  primaryButton: {
    minHeight: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  secondaryButton: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '900' },
});
