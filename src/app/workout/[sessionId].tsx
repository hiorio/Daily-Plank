import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { getWorkoutSession } from '../../data/sessionRepository';
import { AudioCueManager } from '../../engine/AudioCueManager';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import { buildWorkoutRecord, saveWorkoutRecord } from '../../services/workoutRecordService';
import { useSettingsStore } from '../../stores/settingsStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { formatDuration } from '../../utils/duration';

const KEEP_AWAKE_TAG = 'plank-guide-workout';

export default function WorkoutScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = useMemo(() => (sessionId ? getWorkoutSession(sessionId) : null), [sessionId]);
  const snapshot = useWorkoutTimer();
  const startSession = useWorkoutStore((store) => store.startSession);
  const pauseSession = useWorkoutStore((store) => store.pauseSession);
  const resumeSession = useWorkoutStore((store) => store.resumeSession);
  const moveToNextStep = useWorkoutStore((store) => store.moveToNextStep);
  const moveToPreviousStep = useWorkoutStore((store) => store.moveToPreviousStep);
  const cancelSession = useWorkoutStore((store) => store.cancelSession);
  const clearSession = useWorkoutStore((store) => store.clearSession);
  const engineState = useWorkoutStore((store) => store.state);
  const settings = useSettingsStore((store) => store.settings);
  const cueManagerRef = useRef(new AudioCueManager());
  const handledCompletionRef = useRef(false);
  const startedSessionRef = useRef<string | null>(null);
  const [exitVisible, setExitVisible] = useState(false);

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
    void startSession(session.id).catch((error) => {
      Alert.alert('운동 시작 오류', '세션을 시작하지 못했다.');
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
    const currentStep = snapshot.currentStep;
    if (
      !currentStep ||
      engineState.status === 'PAUSED' ||
      engineState.stepStartedAt == null ||
      engineState.stepEndsAt == null
    ) {
      return;
    }

    const manager = cueManagerRef.current;
    void manager.playStepStart(currentStep, settings);
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
      Alert.alert('기록 저장 오류', '운동 기록을 저장하지 못했다.');
      if (__DEV__) console.error(error);
    });
  }, [clearSession, engineState, router, session]);

  async function handleExitConfirmed() {
    if (!session) return;
    await cancelSession();
    const cancelledState = useWorkoutStore.getState().state;
    const record = buildWorkoutRecord(session, cancelledState, 'CANCELLED');
    await saveWorkoutRecord(record).catch((error) => {
      Alert.alert('기록 저장 오류', '취소 기록을 저장하지 못했다.');
      if (__DEV__) console.error(error);
    });
    await clearSession();
    router.replace('/');
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>존재하지 않는 세션이다.</Text>
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
  const statusLabel =
    snapshot.status === 'COUNTDOWN' ? '준비 카운트다운' : isRest ? '휴식 남은 시간' : '동작 남은 시간';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.totalTime}>
            전체 {formatDuration(snapshot.totalElapsedSeconds)} / {formatDuration(session.totalDurationSeconds)}
          </Text>
          <Text style={styles.status}>{snapshot.status}</Text>
        </View>
        <WorkoutProgress progressRate={snapshot.progressRate} />
        <WorkoutTimer seconds={snapshot.stepRemainingSeconds} label={statusLabel} />
        <ExerciseGuide
          exercise={currentExercise}
          previewExercise={previewExercise}
          title={currentStep?.title ?? session.title}
          isRest={isRest}
          isPrepare={isPrepare}
          detailed={settings.detailedGuideEnabled}
        />
        <NextStepPreview nextStepTitle={snapshot.nextStep?.title ?? null} />
        <WorkoutControls
          paused={snapshot.status === 'PAUSED'}
          onPrevious={() => void moveToPreviousStep()}
          onTogglePause={() => void (snapshot.status === 'PAUSED' ? resumeSession() : pauseSession())}
          onNext={() => void moveToNextStep()}
          onExit={() => setExitVisible(true)}
        />
      </ScrollView>
      <ConfirmModal
        visible={exitVisible}
        title="운동을 종료할까?"
        message="지금까지 진행한 내용은 취소 기록으로 저장된다."
        cancelLabel="운동 계속하기"
        confirmLabel="운동 종료하기"
        destructive
        onCancel={() => setExitVisible(false)}
        onConfirm={() => void handleExitConfirmed()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalTime: { color: colors.muted, fontWeight: '700' },
  status: { color: colors.primaryDark, fontWeight: '900' },
  errorText: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
