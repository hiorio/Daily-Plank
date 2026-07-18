import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ExerciseGuide } from '../../components/ExerciseGuide';
import { NextStepPreview } from '../../components/NextStepPreview';
import { WorkoutControls } from '../../components/WorkoutControls';
import { WorkoutProgress } from '../../components/WorkoutProgress';
import { WorkoutTimer } from '../../components/WorkoutTimer';
import { colors, spacing } from '../../constants/theme';
import { exerciseById } from '../../data/exercises';
import { AudioCueManager } from '../../engine/AudioCueManager';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { shouldCompleteWorkoutOnExit } from '../../services/workoutExitService';
import { buildWorkoutRecord, saveWorkoutRecord } from '../../services/workoutRecordService';
import { useCustomSessionStore } from '../../stores/customSessionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { formatDuration } from '../../utils/duration';

const KEEP_AWAKE_TAG = 'plank-guide-workout';

export default function WorkoutScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  useCustomSessionStore((store) => store.savedSessions);
  useCustomSessionStore((store) => store.activeByBaseSessionId);
  const getResolvedSession = useCustomSessionStore((store) => store.getResolvedSession);
  const resolvedSession = sessionId ? getResolvedSession(sessionId) : null;
  const snapshot = useWorkoutTimer();
  const startSession = useWorkoutStore((store) => store.startSession);
  const pauseSession = useWorkoutStore((store) => store.pauseSession);
  const resumeSession = useWorkoutStore((store) => store.resumeSession);
  const moveToNextStep = useWorkoutStore((store) => store.moveToNextStep);
  const moveToPreviousStep = useWorkoutStore((store) => store.moveToPreviousStep);
  const cancelSession = useWorkoutStore((store) => store.cancelSession);
  const completeSession = useWorkoutStore((store) => store.completeSession);
  const clearSession = useWorkoutStore((store) => store.clearSession);
  const storedWorkoutSession = useWorkoutStore((store) => store.session);
  const engineState = useWorkoutStore((store) => store.state);
  const settings = useSettingsStore((store) => store.settings);
  const cueManagerRef = useRef(new AudioCueManager());
  const handledCompletionRef = useRef(false);
  const startedSessionRef = useRef<string | null>(null);
  const [exitVisible, setExitVisible] = useState(false);
  const session =
    storedWorkoutSession?.id === sessionId ? storedWorkoutSession : resolvedSession;

  useEffect(() => {
    const manager = cueManagerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    if (
      engineState.sessionId === session.id &&
      (engineState.status === 'COUNTDOWN' ||
        engineState.status === 'RUNNING' ||
        engineState.status === 'PAUSED')
    ) {
      startedSessionRef.current = session.id;
      return;
    }
    if (startedSessionRef.current === session.id) return;
    startedSessionRef.current = session.id;
    void startSession(session).catch((error) => {
      Alert.alert('운동 시작 오류', '세션을 시작하지 못했습니다.');
      if (__DEV__) console.error(error);
      router.replace('/');
    });
  }, [engineState.sessionId, engineState.status, router, session, startSession]);

  useEffect(() => {
    if (!settings.keepAwakeEnabled) {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
      return;
    }
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((error) => {
      if (__DEV__) console.warn('Keep awake activation failed', error);
    });
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [settings.keepAwakeEnabled]);

  useEffect(() => {
    const manager = cueManagerRef.current;
    if (
      engineState.status === 'PAUSED' ||
      engineState.status === 'CANCELLED' ||
      engineState.status === 'COMPLETED'
    ) {
      void manager.stopSpeech();
      return;
    }

    const currentStep = snapshot.currentStep;
    if (
      !currentStep ||
      engineState.stepStartedAt == null ||
      engineState.stepEndsAt == null
    ) {
      return;
    }

    void manager.playStepStart(currentStep, settings, engineState.stepStartedAt);
    void manager.evaluateStepCues(
      currentStep,
      engineState.stepStartedAt,
      engineState.stepEndsAt,
      Date.now(),
      settings,
    );
  }, [
    engineState.currentStepIndex,
    engineState.status,
    engineState.stepEndsAt,
    engineState.stepStartedAt,
    settings,
    snapshot.currentStep,
    snapshot.stepRemainingSeconds,
  ]);

  useEffect(() => {
    async function finishCompletedWorkout() {
      if (!session || engineState.status !== 'COMPLETED' || handledCompletionRef.current) return;
      handledCompletionRef.current = true;
      const record = buildWorkoutRecord(session, engineState, 'COMPLETED');
      await saveWorkoutRecord(record);
      await clearSession();
      router.replace(`/complete?recordId=${record.id}&sessionId=${session.id}`);
    }

    void finishCompletedWorkout().catch((error) => {
      Alert.alert('기록 저장 오류', '운동 기록을 저장하지 못했습니다.');
      if (__DEV__) console.error(error);
    });
  }, [clearSession, engineState, router, session]);

  async function handleExitConfirmed() {
    if (!session) return;
    await cueManagerRef.current.stopSpeech();
    const currentState = useWorkoutStore.getState().state;
    if (shouldCompleteWorkoutOnExit(session, currentState)) {
      handledCompletionRef.current = true;
      await completeSession();
      const completedState = useWorkoutStore.getState().state;
      const record = buildWorkoutRecord(session, completedState, 'COMPLETED');
      try {
        await saveWorkoutRecord(record);
        await clearSession();
        router.replace(`/complete?recordId=${record.id}&sessionId=${session.id}`);
      } catch (error) {
        Alert.alert('기록 저장 오류', '운동 기록을 저장하지 못했습니다.');
        if (__DEV__) console.error(error);
      }
      return;
    }
    await cancelSession();
    const cancelledState = useWorkoutStore.getState().state;
    const record = buildWorkoutRecord(session, cancelledState, 'CANCELLED');
    await saveWorkoutRecord(record).catch((error) => {
      Alert.alert('기록 저장 오류', '취소 기록을 저장하지 못했습니다.');
      if (__DEV__) console.error(error);
    });
    await clearSession();
    router.replace('/');
  }

  async function handlePrevious() {
    await cueManagerRef.current.stopSpeech();
    await moveToPreviousStep();
  }

  async function handleTogglePause() {
    await cueManagerRef.current.stopSpeech();
    if (snapshot.status === 'PAUSED') {
      await resumeSession();
      return;
    }
    await pauseSession();
  }

  async function handleNext() {
    await cueManagerRef.current.stopSpeech();
    await moveToNextStep();
  }

  async function handleExitPress() {
    await cueManagerRef.current.stopSpeech();
    setExitVisible(true);
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>존재하지 않는 세션입니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (snapshot.status === 'COMPLETED' || engineState.status === 'COMPLETED') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.completionShell}>
          <View style={styles.completionPanel}>
            <Text style={styles.completionEyebrow}>SESSION COMPLETE</Text>
            <Text style={styles.completionTitle}>운동 기록을 저장하고 있습니다.</Text>
            <Text style={styles.completionDescription}>곧 완료 화면으로 이동합니다.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = snapshot.currentStep;
  const currentExercise =
    currentStep?.exerciseId != null ? exerciseById.get(currentStep.exerciseId) ?? null : null;
  const previewExercise =
    snapshot.nextStep?.exerciseId != null ? exerciseById.get(snapshot.nextStep.exerciseId) ?? null : null;
  const isRest = currentStep?.type === 'REST' || currentStep?.type === 'COOLDOWN';
  const isPrepare = currentStep?.type === 'PREPARE';
  const activeColor = isRest ? colors.accent : colors.primary;
  const currentStepNumber = Math.min(session.steps.length, engineState.currentStepIndex + 1);
  const stepProgressLabel = `${currentStepNumber} / ${session.steps.length} 단계`;
  const phaseLabel =
    snapshot.status === 'PAUSED'
      ? '일시정지'
      : snapshot.status === 'COUNTDOWN'
        ? '준비 중'
        : isRest
          ? '휴식 구간'
          : '운동 중';
  const statusLabel =
    snapshot.status === 'COUNTDOWN' ? '준비 카운트다운' : isRest ? '휴식 남은 시간' : '동작 남은 시간';

  return (
    <SafeAreaView style={[styles.safeArea, isRest && styles.restSafeArea]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.totalTime}>
            전체 {formatDuration(snapshot.totalElapsedSeconds)} / {formatDuration(session.totalDurationSeconds)}
          </Text>
          <Text style={[styles.status, { color: activeColor }]}>{phaseLabel}</Text>
        </View>
        <WorkoutProgress progressRate={snapshot.progressRate} resting={isRest} />

        <View style={styles.phaseBlock}>
          <View style={styles.phasePill}>
            <Text style={[styles.phaseText, { color: activeColor }]}>
              {phaseLabel} · {stepProgressLabel}
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.stepTitle}>
            {currentStep?.title ?? session.title}
          </Text>
        </View>

        <WorkoutTimer seconds={snapshot.stepRemainingSeconds} label={statusLabel} resting={isRest} />

        <ExerciseGuide
          exercise={currentExercise}
          previewExercise={previewExercise}
          title={currentStep?.title ?? session.title}
          isRest={isRest}
          isPrepare={isPrepare}
          detailed={settings.detailedGuideEnabled}
        />
        <NextStepPreview nextStepTitle={snapshot.nextStep?.title ?? null} />
      </ScrollView>
      <View style={[styles.controlsBar, isRest && styles.restControlsBar]}>
        <WorkoutControls
          paused={snapshot.status === 'PAUSED'}
          onPrevious={() => void handlePrevious()}
          onTogglePause={() => void handleTogglePause()}
          onNext={() => void handleNext()}
          onExit={() => void handleExitPress()}
        />
      </View>
      <ConfirmModal
        visible={exitVisible}
        title="운동을 종료할까요?"
        message="지금까지 진행한 내용은 취소 기록으로 저장됩니다."
        cancelLabel="운동 계속하기"
        confirmLabel="운동 종료"
        destructive
        onCancel={() => setExitVisible(false)}
        onConfirm={() => void handleExitConfirmed()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceAlt },
  restSafeArea: { backgroundColor: colors.accentSoft },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // 운동 중 조작 버튼은 스크롤과 무관하게 항상 하단에 보여야 한다.
  controlsBar: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  restControlsBar: {
    backgroundColor: colors.accentSoft,
  },
  completionShell: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  completionPanel: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  completionEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  completionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  completionDescription: {
    color: colors.muted,
    fontWeight: '700',
    lineHeight: 21,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  totalTime: { color: colors.muted, fontWeight: '800', flex: 1 },
  status: { fontWeight: '900' },
  phaseBlock: {
    gap: spacing.xs,
  },
  phasePill: {
    alignSelf: 'flex-start',
    minHeight: 18,
    justifyContent: 'center',
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '900',
  },
  stepTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  errorText: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
