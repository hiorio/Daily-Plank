import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>완료</Text>
        </View>
        <Text style={styles.title}>세션을 완료했다.</Text>
        <Text style={styles.subtitle}>{record?.sessionTitle ?? '운동 기록을 불러오는 중'}</Text>
        <View style={styles.grid}>
          <StatCard label="계획 시간" value={formatDurationKorean(record?.plannedDurationSeconds ?? 0)} />
          <StatCard label="실제 시간" value={formatDurationKorean(record?.actualDurationSeconds ?? 0)} />
        </View>
        <View style={styles.grid}>
          <StatCard label="완료율" value={`${Math.round(record?.completionRate ?? 0)}%`} />
          <StatCard label="건너뛴 동작" value={`${record?.skippedStepCount ?? 0}개`} />
        </View>
        <View style={styles.grid}>
          <StatCard label="이번 주 누적" value={formatDurationKorean(statistics.weeklyDurationSeconds)} />
          <StatCard label="연속 운동일" value={`${statistics.streakDays}일`} />
        </View>
        <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
          <Text style={styles.primaryText}>홈으로 이동</Text>
        </Pressable>
        {sessionId ? (
          <Pressable onPress={() => router.replace(`/workout/${sessionId}`)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>같은 세션 다시 시작</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg, justifyContent: 'center' },
  badge: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.muted, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: spacing.md },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '900' },
});
