import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmModal } from '../../components/ConfirmModal';
import { colors, radius, spacing } from '../../constants/theme';
import { exerciseById } from '../../data/exercises';
import { getWorkoutSession } from '../../data/sessionRepository';
import { WorkoutStepType } from '../../domain/workoutSession';
import { formatDurationKorean } from '../../utils/duration';

const levelLabel = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
} as const;

const stepTypeLabel: Record<WorkoutStepType, string> = {
  PREPARE: '준비',
  EXERCISE: '운동',
  REST: '휴식',
  COOLDOWN: '마무리',
};

export default function SessionDetailScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = sessionId ? getWorkoutSession(sessionId) : null;
  const [safetyVisible, setSafetyVisible] = useState(false);

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.empty}>
          <Text style={styles.title}>세션을 찾을 수 없습니다.</Text>
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="뒤로" onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>SESSION DETAIL</Text>
            <Text style={styles.title}>{session.title}</Text>
          </View>
        </View>

        <Text style={styles.description}>{session.description}</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{formatDurationKorean(session.totalDurationSeconds)}</Text>
            <Text style={styles.summaryLabel}>운동 시간</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{levelLabel[session.level]}</Text>
            <Text style={styles.summaryLabel}>난이도</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{exerciseSteps.length}개</Text>
            <Text style={styles.summaryLabel}>동작</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>ROUTINE</Text>
          <Text style={styles.sectionTitle}>운동과 휴식 구성</Text>
        </View>
        {session.steps.map((step, index) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={[styles.stepIndex, step.type !== 'EXERCISE' && styles.restIndex]}>
              <Text style={[styles.stepIndexText, step.type !== 'EXERCISE' && styles.restIndexText]}>{index + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepMeta}>
                {stepTypeLabel[step.type]} · {formatDurationKorean(step.durationSeconds)}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}

        <View style={styles.safetyPanel}>
          <Text style={styles.safetyTitle}>시작 전 확인</Text>
          <Text style={styles.safetyText}>
            통증, 어지러움, 호흡 곤란이 있으면 즉시 중단하세요. 자세가 불편하면 더 쉬운 동작으로 바꿔도 됩니다.
          </Text>
        </View>
        {exerciseSteps.slice(0, 5).map((step) => {
          const exercise = step.exerciseId ? exerciseById.get(step.exerciseId) : null;
          return exercise?.cautions.map((caution) => (
            <View key={`${step.id}-${caution}`} style={styles.cautionRow}>
              <Text style={styles.cautionMarker}>!</Text>
              <Text style={styles.caution}>{caution}</Text>
            </View>
          ));
        })}

        <Pressable onPress={() => setSafetyVisible(true)} style={styles.startButton}>
          <Text style={styles.startText}>운동 시작</Text>
        </Pressable>
      </ScrollView>
      <ConfirmModal
        visible={safetyVisible}
        title="운동을 시작할까요?"
        message="무리하지 말고, 통증이나 어지러움이 있으면 즉시 중단하세요."
        cancelLabel="조금 더 확인"
        confirmLabel="시작하기"
        onCancel={() => setSafetyVisible(false)}
        onConfirm={() => {
          setSafetyVisible(false);
          router.push(`/workout/${session.id}`);
        }}
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
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  empty: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
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
  backText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', letterSpacing: 0 },
  description: { color: colors.muted, lineHeight: 22, fontWeight: '700' },
  summaryGrid: { flexDirection: 'row', gap: spacing.md },
  summaryCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  summaryValue: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  sectionHeader: { marginTop: spacing.sm, gap: spacing.xs },
  sectionEyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restIndex: { backgroundColor: colors.accentSoft },
  stepIndexText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  restIndexText: { color: colors.accent },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: { color: colors.text, fontWeight: '900' },
  stepMeta: { color: colors.muted, marginTop: spacing.xs, fontSize: 12, fontWeight: '700' },
  chevron: { color: colors.muted, fontSize: 22, fontWeight: '900' },
  cautionRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cautionMarker: { color: colors.warning, fontWeight: '900' },
  caution: { flex: 1, color: colors.muted, lineHeight: 20 },
  safetyPanel: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  safetyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  safetyText: { color: colors.muted, lineHeight: 21, fontWeight: '700' },
  startButton: {
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
  startText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  primaryButton: {
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '900' },
});
