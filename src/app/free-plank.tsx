import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../constants/theme';
import { getBestCompletedDurationForSession } from '../database/workoutRecordRepository';
import {
  FREE_PLANK_MIN_SAVE_SECONDS,
  FREE_PLANK_SESSION_ID,
  FREE_PLANK_SESSION_TITLE,
} from '../domain/freePlank';
import { WorkoutRecord } from '../domain/workoutRecord';
import { AudioCueManager } from '../engine/AudioCueManager';
import { saveWorkoutRecord } from '../services/workoutRecordService';
import { useSettingsStore } from '../stores/settingsStore';
import { formatDuration, formatDurationKorean } from '../utils/duration';
import { createId } from '../utils/id';

const KEEP_AWAKE_TAG = 'plank-guide-free-plank';

type FreePlankPhase = 'ready' | 'running' | 'done';

interface FreePlankResult {
  seconds: number;
  saved: boolean;
  newBest: boolean;
}

export default function FreePlankScreen() {
  const router = useRouter();
  const settings = useSettingsStore((store) => store.settings);
  const [cueManager] = useState(() => new AudioCueManager());
  const [phase, setPhase] = useState<FreePlankPhase>('ready');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bestSeconds, setBestSeconds] = useState(0);
  const [result, setResult] = useState<FreePlankResult | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    return () => cueManager.dispose();
  }, [cueManager]);

  useEffect(() => {
    void getBestCompletedDurationForSession(FREE_PLANK_SESSION_ID).then(setBestSeconds);
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    const interval = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt != null) {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      }
    }, 200);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' || !settings.keepAwakeEnabled) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch((error) => {
      if (__DEV__) console.warn('Keep awake activation failed', error);
    });
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [phase, settings.keepAwakeEnabled]);

  function handleStart() {
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    setResult(null);
    setPhase('running');
    void cueManager.previewSound(settings);
  }

  async function handleStop() {
    const startedAt = startedAtRef.current;
    if (startedAt == null) return;
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    startedAtRef.current = null;
    setElapsedSeconds(seconds);
    setPhase('done');
    void cueManager.previewSound(settings);

    let saved = false;
    let newBest = false;
    if (seconds >= FREE_PLANK_MIN_SAVE_SECONDS) {
      newBest = seconds > bestSeconds;
      const nowIso = new Date().toISOString();
      const record: WorkoutRecord = {
        id: createId('record'),
        sessionId: FREE_PLANK_SESSION_ID,
        sessionTitle: FREE_PLANK_SESSION_TITLE,
        startedAt: new Date(startedAt).toISOString(),
        completedAt: nowIso,
        plannedDurationSeconds: seconds,
        actualDurationSeconds: seconds,
        completionRate: 100,
        skippedStepCount: 0,
        status: 'COMPLETED',
      };
      try {
        await saveWorkoutRecord(record);
        saved = true;
        if (newBest) setBestSeconds(seconds);
      } catch (error) {
        if (__DEV__) console.error('Free plank record save failed', error);
        newBest = false;
      }
    }
    setResult({ seconds, saved, newBest });
  }

  const running = phase === 'running';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="뒤로"
            disabled={running}
            onPress={() => router.back()}
            style={[styles.backButton, running && styles.backButtonDisabled]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>FREE PLANK</Text>
            <Text style={styles.title}>자유 플랭크</Text>
          </View>
        </View>

        <View style={styles.bestCard}>
          <Text style={styles.bestLabel}>나의 최고 기록</Text>
          <Text style={styles.bestValue}>
            {bestSeconds > 0 ? formatDurationKorean(bestSeconds) : '아직 없음'}
          </Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>{running ? '버티는 중!' : '버틴 시간'}</Text>
          <Text style={styles.timerValue}>{formatDuration(elapsedSeconds)}</Text>
          {running && bestSeconds > 0 && elapsedSeconds > bestSeconds ? (
            <Text style={styles.newBestLive}>🎉 최고 기록 경신 중!</Text>
          ) : null}
        </View>

        {result ? (
          <View style={styles.resultCard}>
            {result.newBest ? (
              <Text style={styles.resultHighlight}>🎉 새로운 최고 기록!</Text>
            ) : null}
            <Text style={styles.resultTitle}>{formatDurationKorean(result.seconds)} 버텼습니다.</Text>
            <Text style={styles.resultMeta}>
              {result.saved
                ? '기록이 저장되어 통계와 연속 운동일에 반영됩니다.'
                : `${FREE_PLANK_MIN_SAVE_SECONDS}초 미만 시도는 저장되지 않습니다.`}
            </Text>
          </View>
        ) : (
          <Text style={styles.helpText}>
            시간 제한 없이 플랭크 자세를 유지해 보세요. 그만하기를 누르면 버틴 시간이 기록됩니다.
          </Text>
        )}

        <View style={styles.actions}>
          {running ? (
            <Pressable onPress={() => void handleStop()} style={[styles.primaryButton, styles.stopButton]}>
              <Text style={styles.primaryText}>그만하기</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleStart} style={styles.primaryButton}>
              <Text style={styles.primaryText}>{phase === 'done' ? '다시 도전' : '시작하기'}</Text>
            </Pressable>
          )}
          {phase === 'done' ? (
            <Pressable onPress={() => router.replace('/')} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>홈으로 이동</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surfaceAlt },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
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
  backButtonDisabled: { opacity: 0.4 },
  backText: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 30 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  bestCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bestLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '900' },
  bestValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  timerCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerLabel: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  timerValue: { color: colors.text, fontSize: 72, fontWeight: '900' },
  newBestLive: { color: colors.accent, fontSize: 15, fontWeight: '900' },
  resultCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  resultHighlight: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  resultTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  resultMeta: { color: colors.muted, lineHeight: 20, fontWeight: '700' },
  helpText: { color: colors.muted, lineHeight: 21, fontWeight: '700' },
  actions: { gap: spacing.md },
  primaryButton: {
    minHeight: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: { backgroundColor: colors.danger },
  primaryText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  secondaryButton: {
    minHeight: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '900' },
});
