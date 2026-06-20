import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { getWorkoutSession } from '../data/sessionRepository';
import { WorkoutSession, WorkoutStep } from '../domain/workoutSession';
import {
  initialWorkoutEngineState,
  WorkoutEngine,
  WorkoutEngineState,
  WorkoutStatus,
} from '../engine/WorkoutEngine';
import { calculateRemainingMs } from '../engine/TimerEngine';

const ACTIVE_WORKOUT_KEY = 'plank-guide:active-workout';
const engine = new WorkoutEngine();

export interface WorkoutSnapshot {
  status: WorkoutStatus;
  session: WorkoutSession | null;
  currentStep: WorkoutStep | null;
  nextStep: WorkoutStep | null;
  stepRemainingSeconds: number;
  totalElapsedSeconds: number;
  progressRate: number;
}

interface WorkoutStore {
  state: WorkoutEngineState;
  session: WorkoutSession | null;
  recoverableState: WorkoutEngineState | null;
  startSession: (sessionId: string) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  moveToNextStep: () => Promise<void>;
  moveToPreviousStep: () => Promise<void>;
  cancelSession: () => Promise<void>;
  clearSession: () => Promise<void>;
  tick: (now?: number) => Promise<void>;
  persistActiveWorkout: () => Promise<void>;
  checkRecoverableWorkout: () => Promise<void>;
  restoreRecoverableWorkout: () => Promise<void>;
  discardRecoverableWorkout: () => Promise<void>;
  getSnapshot: (now?: number) => WorkoutSnapshot;
}

function getSessionOrThrow(sessionId: string | null): WorkoutSession {
  if (!sessionId) throw new Error('No active session id.');
  const session = getWorkoutSession(sessionId);
  if (!session) throw new Error(`Unknown session id: ${sessionId}`);
  return session;
}

async function persistState(state: WorkoutEngineState): Promise<void> {
  if (
    state.status === 'RUNNING' ||
    state.status === 'COUNTDOWN' ||
    state.status === 'PAUSED' ||
    state.status === 'CANCELLED'
  ) {
    await AsyncStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(state));
  } else {
    await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
  }
}

function snapshotFromState(
  state: WorkoutEngineState,
  session: WorkoutSession | null,
  now: number,
): WorkoutSnapshot {
  const currentStep = session?.steps[state.currentStepIndex] ?? null;
  const nextStep = session?.steps[state.currentStepIndex + 1] ?? null;
  const stepRemainingSeconds =
    state.status === 'PAUSED' && state.stepEndsAt && state.pausedAt
      ? Math.ceil(calculateRemainingMs(state.stepEndsAt, state.pausedAt) / 1000)
      : Math.ceil(calculateRemainingMs(state.stepEndsAt, now) / 1000);
  const totalElapsedSeconds =
    session && state.sessionStartedAt
      ? Math.min(
          session.totalDurationSeconds,
          Math.max(0, Math.floor((now - state.sessionStartedAt - state.accumulatedPauseMs) / 1000)),
        )
      : 0;

  return {
    status: state.status,
    session,
    currentStep,
    nextStep,
    stepRemainingSeconds,
    totalElapsedSeconds,
    progressRate: session ? Math.min(100, (totalElapsedSeconds / session.totalDurationSeconds) * 100) : 0,
  };
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  state: initialWorkoutEngineState,
  session: null,
  recoverableState: null,
  startSession: async (sessionId) => {
    const session = getWorkoutSession(sessionId);
    if (!session) throw new Error(`Unknown session id: ${sessionId}`);
    const nextState = engine.startSession(session);
    set({ state: nextState, session, recoverableState: null });
    await persistState(nextState);
  },
  pauseSession: async () => {
    const nextState = engine.pauseSession();
    set({ state: nextState });
    await persistState(nextState);
  },
  resumeSession: async () => {
    const session = get().session ?? getSessionOrThrow(get().state.sessionId);
    const nextState = engine.resumeSession(session);
    set({ state: nextState, session });
    await persistState(nextState);
  },
  moveToNextStep: async () => {
    const session = get().session ?? getSessionOrThrow(get().state.sessionId);
    const nextState = engine.moveToNextStep(session);
    set({ state: nextState, session });
    await persistState(nextState);
  },
  moveToPreviousStep: async () => {
    const session = get().session ?? getSessionOrThrow(get().state.sessionId);
    const nextState = engine.moveToPreviousStep(session);
    set({ state: nextState, session });
    await persistState(nextState);
  },
  cancelSession: async () => {
    const nextState = engine.cancelSession();
    set({ state: nextState });
    await persistState(nextState);
  },
  clearSession: async () => {
    engine.replaceState(initialWorkoutEngineState);
    set({ state: initialWorkoutEngineState, session: null });
    await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
  },
  tick: async (now = Date.now()) => {
    const activeSession = get().session;
    if (!activeSession) return;
    const nextState = engine.reconcile(activeSession, now);
    set({ state: nextState });
    await persistState(nextState);
  },
  persistActiveWorkout: async () => {
    await persistState(get().state);
  },
  checkRecoverableWorkout: async () => {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as WorkoutEngineState;
      if (
        parsed.status === 'RUNNING' ||
        parsed.status === 'COUNTDOWN' ||
        parsed.status === 'PAUSED' ||
        parsed.status === 'CANCELLED'
      ) {
        set({ recoverableState: parsed });
      }
    } catch (error) {
      if (__DEV__) console.warn('Recoverable workout state is invalid.', error);
      await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
    }
  },
  restoreRecoverableWorkout: async () => {
    const recoverableState = get().recoverableState;
    if (!recoverableState) return;
    const session = getSessionOrThrow(recoverableState.sessionId);
    engine.replaceState(recoverableState);
    const nextState = engine.restoreSession(session);
    set({ state: nextState, session, recoverableState: null });
    await persistState(nextState);
  },
  discardRecoverableWorkout: async () => {
    set({ recoverableState: null });
    await AsyncStorage.removeItem(ACTIVE_WORKOUT_KEY);
  },
  getSnapshot: (now = Date.now()) => snapshotFromState(get().state, get().session, now),
}));
