import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { appCopy } from '../constants/copy';
import { initializeDatabase } from '../database/database';
import { useAppLifecycle } from '../hooks/useAppLifecycle';
import { buildWorkoutRecord, saveWorkoutRecord } from '../services/workoutRecordService';
import { useCustomSessionStore } from '../stores/customSessionStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useWorkoutStore } from '../stores/workoutStore';

export default function RootLayout() {
  useAppLifecycle();
  const router = useRouter();
  const hydrateSettings = useSettingsStore((store) => store.hydrate);
  const hydrateCustomSessions = useCustomSessionStore((store) => store.hydrate);
  const checkRecoverableWorkout = useWorkoutStore((store) => store.checkRecoverableWorkout);
  const recoverableState = useWorkoutStore((store) => store.recoverableState);
  const recoverableSession = useWorkoutStore((store) => store.recoverableSession);
  const restoreRecoverableWorkout = useWorkoutStore((store) => store.restoreRecoverableWorkout);
  const discardRecoverableWorkout = useWorkoutStore((store) => store.discardRecoverableWorkout);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        await initializeDatabase();
        await hydrateSettings();
        await hydrateCustomSessions();
        await checkRecoverableWorkout();
      } catch (error) {
        Alert.alert('초기화 오류', '앱 데이터를 준비하지 못했다. 다시 실행해 주세요.');
        if (__DEV__) console.error(error);
      } finally {
        setReady(true);
      }
    }
    void boot();
  }, [checkRecoverableWorkout, hydrateCustomSessions, hydrateSettings]);

  async function handleRestore() {
    const sessionId = recoverableSession?.id ?? recoverableState?.sessionId;
    await restoreRecoverableWorkout();
    if (sessionId) {
      router.replace(`/workout/${sessionId}`);
    }
  }

  async function handleDiscard() {
    if (recoverableState && recoverableSession) {
      const record = buildWorkoutRecord(recoverableSession, recoverableState, 'CANCELLED');
      await saveWorkoutRecord(record).catch((error) => {
        if (__DEV__) console.error(error);
      });
    }
    await discardRecoverableWorkout();
  }

  if (!ready) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          headerTitleAlign: 'center',
          headerShadowVisible: false,
        }}
      />
      <ConfirmModal
        visible={!!recoverableState}
        title={appCopy.continueWorkoutTitle}
        message={appCopy.continueWorkoutMessage}
        cancelLabel="기록하지 않고 종료하기"
        confirmLabel="이어서 하기"
        destructive
        onCancel={() => void handleDiscard()}
        onConfirm={() => void handleRestore()}
      />
    </>
  );
}
