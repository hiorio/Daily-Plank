import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmModal } from '../../components/ConfirmModal';
import { colors, radius, spacing } from '../../constants/theme';
import { exerciseById, exercises } from '../../data/exercises';
import { getWorkoutSession } from '../../data/sessionRepository';
import { WorkoutStepType } from '../../domain/workoutSession';
import { getSafeRestDurations } from '../../services/sessionGuidanceService';
import { canEditCustomSessions } from '../../services/subscriptionGate';
import { useCustomSessionStore } from '../../stores/customSessionStore';
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
  const baseSession = sessionId ? getWorkoutSession(sessionId) : null;
  const savedSessions = useCustomSessionStore((store) => store.savedSessions);
  const activeByBaseSessionId = useCustomSessionStore((store) => store.activeByBaseSessionId);
  const getResolvedSession = useCustomSessionStore((store) => store.getResolvedSession);
  const replaceExercise = useCustomSessionStore((store) => store.replaceExercise);
  const setStepDuration = useCustomSessionStore((store) => store.setStepDuration);
  const resetBaseSession = useCustomSessionStore((store) => store.resetBaseSession);
  const duplicateActiveSession = useCustomSessionStore((store) => store.duplicateActiveSession);
  const selectSavedSession = useCustomSessionStore((store) => store.selectSavedSession);
  const session = sessionId ? getResolvedSession(sessionId) : null;
  const [safetyVisible, setSafetyVisible] = useState(false);
  const [exercisePickerStepId, setExercisePickerStepId] = useState<string | null>(null);
  const [durationPickerStepId, setDurationPickerStepId] = useState<string | null>(null);
  const customSessionsForBase = savedSessions.filter((item) => item.baseSessionId === sessionId);
  const activeCustomSessionId = sessionId ? activeByBaseSessionId[sessionId] : undefined;
  const activeCustomSession = customSessionsForBase.find((item) => item.id === activeCustomSessionId);
  const customizationEnabled = canEditCustomSessions();

  if (!baseSession || !session) {
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
  const selectedExerciseStep = session.steps.find((step) => step.id === exercisePickerStepId);
  const selectedDurationStep = session.steps.find((step) => step.id === durationPickerStepId);

  async function handleSelectExercise(exerciseId: string) {
    if (!sessionId || !customizationEnabled) return;
    const stepId = exercisePickerStepId;
    setExercisePickerStepId(null);
    if (!stepId) return;
    await replaceExercise(sessionId, stepId, exerciseId);
  }

  async function handleSelectRestDuration(durationSeconds: number) {
    if (!sessionId || !customizationEnabled) return;
    const stepId = durationPickerStepId;
    setDurationPickerStepId(null);
    if (!stepId) return;
    await setStepDuration(sessionId, stepId, durationSeconds);
  }

  async function handleResetSession() {
    if (!sessionId) return;
    await resetBaseSession(sessionId);
  }

  async function handleDuplicateSession() {
    if (!sessionId || !customizationEnabled) return;
    await duplicateActiveSession(sessionId);
  }

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
        <View style={styles.customPanel}>
          <View style={styles.customTextBlock}>
            <Text style={styles.customTitle}>
              {activeCustomSession ? activeCustomSession.name : '기본 구성'}
            </Text>
            <Text style={styles.customDescription}>
              운동을 누르면 동작을 바꾸고, 휴식을 누르면 시간을 바꿀 수 있습니다.
            </Text>
          </View>
          <View style={styles.customActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleDuplicateSession()}
              style={({ pressed }) => [styles.smallActionButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.smallActionText}>새 구성 저장</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleResetSession()}
              style={({ pressed }) => [styles.smallGhostButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.smallGhostText}>초기화</Text>
            </Pressable>
          </View>
        </View>
        {customSessionsForBase.length > 0 ? (
          <View style={styles.savedPanel}>
            <Text style={styles.savedTitle}>저장된 구성</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedList}>
              {customSessionsForBase.map((customSession) => {
                const active = customSession.id === activeCustomSessionId;
                return (
                  <Pressable
                    key={customSession.id}
                    accessibilityRole="button"
                    onPress={() => {
                      if (sessionId) void selectSavedSession(sessionId, customSession.id);
                    }}
                    style={({ pressed }) => [
                      styles.savedChip,
                      active && styles.savedChipActive,
                      pressed && styles.pressedButton,
                    ]}
                  >
                    <Text style={[styles.savedChipText, active && styles.savedChipTextActive]}>
                      {customSession.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
        {session.steps.map((step, index) => (
          <Pressable
            key={step.id}
            accessibilityRole={step.type === 'EXERCISE' || step.type === 'REST' ? 'button' : undefined}
            onPress={() => {
              if (!customizationEnabled) return;
              if (step.type === 'EXERCISE') setExercisePickerStepId(step.id);
              if (step.type === 'REST') setDurationPickerStepId(step.id);
            }}
            style={({ pressed }) => [
              styles.stepRow,
              (step.type === 'EXERCISE' || step.type === 'REST') && styles.editableStepRow,
              pressed && (step.type === 'EXERCISE' || step.type === 'REST') && styles.pressedButton,
            ]}
          >
            <View style={[styles.stepIndex, step.type !== 'EXERCISE' && styles.restIndex]}>
              <Text style={[styles.stepIndexText, step.type !== 'EXERCISE' && styles.restIndexText]}>{index + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepMeta}>
                {stepTypeLabel[step.type]} · {formatDurationKorean(step.durationSeconds)}
              </Text>
            </View>
            <Text style={styles.chevron}>
              {step.type === 'EXERCISE' ? '변경' : step.type === 'REST' ? '시간' : ' '}
            </Text>
          </Pressable>
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
      <Modal visible={!!exercisePickerStepId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedExerciseStep?.title ?? '운동'} 변경
              </Text>
              <Pressable onPress={() => setExercisePickerStepId(null)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>닫기</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.optionList}>
              {exercises.map((exercise) => {
                const selected = selectedExerciseStep?.exerciseId === exercise.id;
                return (
                  <Pressable
                    key={exercise.id}
                    accessibilityRole="button"
                    onPress={() => void handleSelectExercise(exercise.id)}
                    style={({ pressed }) => [
                      styles.exerciseOption,
                      selected && styles.exerciseOptionSelected,
                      pressed && styles.pressedButton,
                    ]}
                  >
                    <View style={styles.exerciseOptionText}>
                      <Text style={[styles.exerciseOptionTitle, selected && styles.exerciseOptionTitleSelected]}>
                        {exercise.name}
                      </Text>
                      <Text style={styles.exerciseOptionDescription}>{exercise.shortDescription}</Text>
                    </View>
                    <Text style={[styles.exerciseDifficulty, selected && styles.exerciseDifficultySelected]}>
                      난도 {exercise.difficulty}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={!!durationPickerStepId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.durationPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDurationStep?.title ?? '휴식'} 시간</Text>
              <Pressable onPress={() => setDurationPickerStepId(null)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>닫기</Text>
              </Pressable>
            </View>
            <View style={styles.durationOptions}>
              {getSafeRestDurations().map((duration) => {
                const selected = selectedDurationStep?.durationSeconds === duration;
                return (
                  <Pressable
                    key={duration}
                    accessibilityRole="button"
                    onPress={() => void handleSelectRestDuration(duration)}
                    style={({ pressed }) => [
                      styles.durationOption,
                      selected && styles.durationOptionSelected,
                      pressed && styles.pressedButton,
                    ]}
                  >
                    <Text style={[styles.durationOptionText, selected && styles.durationOptionTextSelected]}>
                      {duration}초
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
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
  customPanel: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  customTextBlock: { gap: spacing.xs },
  customTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  customDescription: { color: colors.muted, lineHeight: 20, fontWeight: '700' },
  customActions: { flexDirection: 'row', gap: spacing.sm },
  smallActionButton: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  smallActionText: { color: '#FFFFFF', fontWeight: '900' },
  smallGhostButton: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  smallGhostText: { color: colors.text, fontWeight: '900' },
  savedPanel: {
    gap: spacing.sm,
  },
  savedTitle: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  savedList: { gap: spacing.sm, paddingRight: spacing.lg },
  savedChip: {
    minHeight: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  savedChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  savedChipText: { color: colors.text, fontWeight: '800' },
  savedChipTextActive: { color: '#FFFFFF' },
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
  editableStepRow: {
    borderColor: colors.primarySoft,
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
  chevron: { color: colors.primary, fontSize: 12, fontWeight: '900', minWidth: 34, textAlign: 'right' },
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
  pressedButton: { opacity: 0.72 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    width: '100%',
    maxHeight: '82%',
    maxWidth: 430,
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  durationPanel: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900', flex: 1 },
  modalCloseButton: {
    minHeight: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalCloseText: { color: colors.text, fontWeight: '900' },
  optionList: { gap: spacing.sm, paddingBottom: spacing.lg },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  exerciseOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  exerciseOptionText: { flex: 1, minWidth: 0, gap: spacing.xs },
  exerciseOptionTitle: { color: colors.text, fontWeight: '900' },
  exerciseOptionTitleSelected: { color: colors.primary },
  exerciseOptionDescription: { color: colors.muted, lineHeight: 19, fontSize: 12, fontWeight: '700' },
  exerciseDifficulty: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  exerciseDifficultySelected: { color: colors.primary },
  durationOptions: { flexDirection: 'row', gap: spacing.md },
  durationOption: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationOptionText: { color: colors.text, fontSize: 16, fontWeight: '900' },
  durationOptionTextSelected: { color: '#FFFFFF' },
});
