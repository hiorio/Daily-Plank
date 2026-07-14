import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';
import { getExerciseDurationSeconds, WorkoutSession } from '../domain/workoutSession';
import { formatDurationKorean } from '../utils/duration';

const levelLabel = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
} as const;

interface SessionCardProps {
  session: WorkoutSession;
  onPrepare: () => void;
  onStart: () => void;
}

export function SessionCard({ session, onPrepare, onStart }: SessionCardProps) {
  const exerciseCount = session.steps.filter((step) => step.type === 'EXERCISE').length;
  const exerciseDurationSeconds = getExerciseDurationSeconds(session);
  const level = levelLabel[session.level];
  const minutes = Math.round(exerciseDurationSeconds / 60);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.durationTile}>
          <Text style={styles.durationValue}>{minutes}</Text>
          <Text style={styles.durationUnit}>분</Text>
        </View>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.meta}>
            운동 {formatDurationKorean(exerciseDurationSeconds)} · 전체{' '}
            {formatDurationKorean(session.totalDurationSeconds)} · {exerciseCount}개 동작
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{level}</Text>
        </View>
      </View>
      <Text style={styles.description}>{session.description}</Text>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={onPrepare} style={styles.prepareButton}>
          <Text style={styles.prepareButtonText}>준비하기</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onStart} style={styles.startButton}>
          <Text style={styles.startButtonText}>바로시작</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  durationTile: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  durationUnit: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  prepareButton: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  prepareButtonText: {
    color: colors.primary,
    fontWeight: '900',
  },
  startButton: {
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
});
