import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../constants/theme';
import { exerciseById } from '../../data/exercises';
import { getWorkoutSession } from '../../data/sessionRepository';
import { formatDurationKorean } from '../../utils/duration';

const levelLabel = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
} as const;

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = sessionId ? getWorkoutSession(sessionId) : null;

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.title}>세션을 찾을 수 없다.</Text>
          <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
            <Text style={styles.primaryText}>홈으로 이동</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const exerciseSteps = session.steps.filter((step) => step.type === 'EXERCISE');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{session.title}</Text>
        <Text style={styles.description}>{session.description}</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{formatDurationKorean(session.totalDurationSeconds)}</Text>
          <Text style={styles.summaryText}>{levelLabel[session.level]}</Text>
          <Text style={styles.summaryText}>{exerciseSteps.length}개 동작</Text>
        </View>

        <Text style={styles.sectionTitle}>운동과 휴식 구성</Text>
        {session.steps.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <Text style={styles.stepIndex}>{index + 1}</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepMeta}>
                {step.type} · {formatDurationKorean(step.durationSeconds)}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>주의사항</Text>
        {exerciseSteps.slice(0, 5).map((step) => {
          const exercise = step.exerciseId ? exerciseById.get(step.exerciseId) : null;
          return exercise?.cautions.map((caution) => (
            <View key={`${step.id}-${caution}`} style={styles.cautionRow}>
              <Text style={styles.cautionMarker}>!</Text>
              <Text style={styles.caution}>{caution}</Text>
            </View>
          ));
        })}

        <Pressable onPress={() => router.push(`/workout/${session.id}`)} style={styles.startButton}>
          <Text style={styles.startText}>운동 시작</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  empty: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  description: { color: colors.muted, lineHeight: 22 },
  summary: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  summaryText: {
    color: colors.primaryDark,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    fontWeight: '800',
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: spacing.sm },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepIndex: { width: 28, color: colors.primary, fontWeight: '900' },
  stepBody: { flex: 1 },
  stepTitle: { color: colors.text, fontWeight: '800' },
  stepMeta: { color: colors.muted, marginTop: spacing.xs },
  cautionRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cautionMarker: { color: colors.accent, fontWeight: '900' },
  caution: { flex: 1, color: colors.muted, lineHeight: 20 },
  startButton: {
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  startText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
});
