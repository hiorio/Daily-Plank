import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WorkoutSession } from '../domain/workoutSession';
import { formatDurationKorean } from '../utils/duration';
import { colors, radius, spacing } from '../constants/theme';

const levelLabel = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
} as const;

interface SessionCardProps {
  session: WorkoutSession;
  onPress: () => void;
  onStart: () => void;
}

export function SessionCard({ session, onPress, onStart }: SessionCardProps) {
  const exerciseCount = session.steps.filter((step) => step.type === 'EXERCISE').length;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{session.title}</Text>
          <Text style={styles.meta}>
            {formatDurationKorean(session.totalDurationSeconds)} · {levelLabel[session.level]} ·{' '}
            {exerciseCount}개 동작
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.muted} />
      </View>
      <Text style={styles.description}>{session.description}</Text>
      <Pressable accessibilityRole="button" onPress={onStart} style={styles.button}>
        <Ionicons name="play" size={18} color="#FFFFFF" />
        <Text style={styles.buttonText}>시작</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.xs,
  },
  description: {
    color: colors.muted,
    lineHeight: 20,
  },
  button: {
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
