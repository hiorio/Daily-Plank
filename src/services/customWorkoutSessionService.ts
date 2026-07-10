import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CustomWorkoutSession,
  CustomWorkoutSessionState,
  emptyCustomWorkoutSessionState,
} from '../domain/customWorkoutSession';
import { WorkoutSession } from '../domain/workoutSession';
import { buildGuidedCustomSession } from './sessionGuidanceService';

const CUSTOM_WORKOUT_SESSION_KEY = 'plank-guide:custom-workout-sessions';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWorkoutSession(value: unknown): value is WorkoutSession {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.totalDurationSeconds === 'number' &&
    Array.isArray(value.steps)
  );
}

function normalizeCustomSession(value: unknown): CustomWorkoutSession | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.baseSessionId !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !isWorkoutSession(value.session)
  ) {
    return null;
  }

  return {
    id: value.id,
    baseSessionId: value.baseSessionId,
    name: value.name,
    session: buildGuidedCustomSession(value.session),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function normalizeState(value: unknown): CustomWorkoutSessionState {
  if (!isRecord(value)) return emptyCustomWorkoutSessionState;

  const savedSessions = Array.isArray(value.savedSessions)
    ? value.savedSessions
        .map((session) => normalizeCustomSession(session))
        .filter((session): session is CustomWorkoutSession => Boolean(session))
    : [];

  const savedSessionIds = new Set(savedSessions.map((session) => session.id));
  const activeByBaseSessionId: Record<string, string | undefined> = {};
  if (isRecord(value.activeByBaseSessionId)) {
    for (const [baseSessionId, customSessionId] of Object.entries(value.activeByBaseSessionId)) {
      if (typeof customSessionId === 'string' && savedSessionIds.has(customSessionId)) {
        activeByBaseSessionId[baseSessionId] = customSessionId;
      }
    }
  }

  return { savedSessions, activeByBaseSessionId };
}

export async function loadCustomWorkoutSessionState(): Promise<CustomWorkoutSessionState> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_WORKOUT_SESSION_KEY);
    if (!raw) return emptyCustomWorkoutSessionState;
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (__DEV__) console.warn('Custom workout sessions are corrupted. Falling back to defaults.', error);
    return emptyCustomWorkoutSessionState;
  }
}

export async function saveCustomWorkoutSessionState(state: CustomWorkoutSessionState): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_WORKOUT_SESSION_KEY, JSON.stringify(normalizeState(state)));
}
