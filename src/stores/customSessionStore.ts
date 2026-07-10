import { create } from 'zustand';
import {
  CustomWorkoutSession,
  CustomWorkoutSessionState,
  emptyCustomWorkoutSessionState,
} from '../domain/customWorkoutSession';
import { WorkoutSession } from '../domain/workoutSession';
import { getWorkoutSession, getWorkoutSessions } from '../data/sessionRepository';
import {
  loadCustomWorkoutSessionState,
  saveCustomWorkoutSessionState,
} from '../services/customWorkoutSessionService';
import {
  buildGuidedCustomSession,
  replaceExerciseInSession,
  replaceStepDurationInSession,
} from '../services/sessionGuidanceService';
import {
  canCreateMultipleCustomSessions,
  canEditCustomSessions,
  canSaveCustomSessions,
} from '../services/subscriptionGate';

interface CustomSessionStore extends CustomWorkoutSessionState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  getResolvedSession: (baseSessionId: string) => WorkoutSession | null;
  getResolvedSessions: () => WorkoutSession[];
  replaceExercise: (baseSessionId: string, stepId: string, exerciseId: string) => Promise<void>;
  setStepDuration: (baseSessionId: string, stepId: string, durationSeconds: number) => Promise<void>;
  resetBaseSession: (baseSessionId: string) => Promise<void>;
  duplicateActiveSession: (baseSessionId: string) => Promise<void>;
  selectSavedSession: (baseSessionId: string, customSessionId: string) => Promise<void>;
}

function cloneSession(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    steps: session.steps.map((step) => {
      const nextStep = { ...step };
      if (step.cues) nextStep.cues = step.cues.map((cue) => ({ ...cue }));
      return nextStep;
    }),
  };
}

function createCustomSessionId(baseSessionId: string): string {
  return `${baseSessionId}:custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function getNextCustomName(baseSession: WorkoutSession, savedSessions: CustomWorkoutSession[]): string {
  const count = savedSessions.filter((session) => session.baseSessionId === baseSession.id).length + 1;
  return `${baseSession.title} 커스텀 ${count}`;
}

function runtimeSessionFromBase(baseSession: WorkoutSession, session: WorkoutSession): WorkoutSession {
  const runtimeSession: WorkoutSession = {
    ...session,
    id: baseSession.id,
    title: baseSession.title,
    description: baseSession.description,
    level: baseSession.level,
  };
  if (baseSession.estimatedCalories != null) {
    runtimeSession.estimatedCalories = baseSession.estimatedCalories;
  }
  return buildGuidedCustomSession(runtimeSession);
}

function resolveSession(
  baseSessionId: string,
  savedSessions: CustomWorkoutSession[],
  activeByBaseSessionId: Record<string, string | undefined>,
): WorkoutSession | null {
  const baseSession = getWorkoutSession(baseSessionId);
  if (!baseSession) return null;
  const activeCustomSessionId = activeByBaseSessionId[baseSessionId];
  const activeCustomSession = savedSessions.find((session) => session.id === activeCustomSessionId);
  return activeCustomSession ? runtimeSessionFromBase(baseSession, activeCustomSession.session) : baseSession;
}

async function persist(set: (state: Partial<CustomSessionStore>) => void, state: CustomWorkoutSessionState) {
  set(state);
  await saveCustomWorkoutSessionState(state);
}

export const useCustomSessionStore = create<CustomSessionStore>((set, get) => ({
  ...emptyCustomWorkoutSessionState,
  hydrated: false,
  hydrate: async () => {
    const state = await loadCustomWorkoutSessionState();
    set({ ...state, hydrated: true });
  },
  getResolvedSession: (baseSessionId) =>
    resolveSession(baseSessionId, get().savedSessions, get().activeByBaseSessionId),
  getResolvedSessions: () =>
    getWorkoutSessions().map(
      (session) =>
        resolveSession(session.id, get().savedSessions, get().activeByBaseSessionId) ?? session,
    ),
  replaceExercise: async (baseSessionId, stepId, exerciseId) => {
    if (!canEditCustomSessions() || !canSaveCustomSessions()) return;
    const baseSession = getWorkoutSession(baseSessionId);
    if (!baseSession) return;
    await upsertActiveSession(baseSession, (session) =>
      replaceExerciseInSession(session, stepId, exerciseId),
    );
  },
  setStepDuration: async (baseSessionId, stepId, durationSeconds) => {
    if (!canEditCustomSessions() || !canSaveCustomSessions()) return;
    const baseSession = getWorkoutSession(baseSessionId);
    if (!baseSession) return;
    await upsertActiveSession(baseSession, (session) =>
      replaceStepDurationInSession(session, stepId, durationSeconds),
    );
  },
  resetBaseSession: async (baseSessionId) => {
    const nextState = {
      savedSessions: get().savedSessions,
      activeByBaseSessionId: {
        ...get().activeByBaseSessionId,
        [baseSessionId]: undefined,
      },
    };
    await persist(set, nextState);
  },
  duplicateActiveSession: async (baseSessionId) => {
    if (!canCreateMultipleCustomSessions() || !canSaveCustomSessions()) return;
    const baseSession = getWorkoutSession(baseSessionId);
    if (!baseSession) return;
    const currentSession =
      resolveSession(baseSessionId, get().savedSessions, get().activeByBaseSessionId) ?? baseSession;
    const now = new Date().toISOString();
    const customSession: CustomWorkoutSession = {
      id: createCustomSessionId(baseSession.id),
      baseSessionId: baseSession.id,
      name: getNextCustomName(baseSession, get().savedSessions),
      session: runtimeSessionFromBase(baseSession, cloneSession(currentSession)),
      createdAt: now,
      updatedAt: now,
    };
    const nextState = {
      savedSessions: [...get().savedSessions, customSession],
      activeByBaseSessionId: {
        ...get().activeByBaseSessionId,
        [baseSession.id]: customSession.id,
      },
    };
    await persist(set, nextState);
  },
  selectSavedSession: async (baseSessionId, customSessionId) => {
    const customSession = get().savedSessions.find(
      (session) => session.id === customSessionId && session.baseSessionId === baseSessionId,
    );
    if (!customSession) return;
    const nextState = {
      savedSessions: get().savedSessions,
      activeByBaseSessionId: {
        ...get().activeByBaseSessionId,
        [baseSessionId]: customSessionId,
      },
    };
    await persist(set, nextState);
  },
}));

async function upsertActiveSession(
  baseSession: WorkoutSession,
  updateSession: (session: WorkoutSession) => WorkoutSession,
): Promise<void> {
  const store = useCustomSessionStore.getState();
  const activeCustomSessionId = store.activeByBaseSessionId[baseSession.id];
  const activeCustomSession = store.savedSessions.find(
    (session) => session.id === activeCustomSessionId,
  );
  const sourceSession = activeCustomSession?.session ?? baseSession;
  const now = new Date().toISOString();
  const nextSession = runtimeSessionFromBase(baseSession, updateSession(cloneSession(sourceSession)));
  const nextCustomSession: CustomWorkoutSession = {
    id: activeCustomSession?.id ?? createCustomSessionId(baseSession.id),
    baseSessionId: baseSession.id,
    name: activeCustomSession?.name ?? getNextCustomName(baseSession, store.savedSessions),
    session: nextSession,
    createdAt: activeCustomSession?.createdAt ?? now,
    updatedAt: now,
  };
  const savedSessions = activeCustomSession
    ? store.savedSessions.map((session) =>
        session.id === activeCustomSession.id ? nextCustomSession : session,
      )
    : [...store.savedSessions, nextCustomSession];

  await persist(useCustomSessionStore.setState, {
    savedSessions,
    activeByBaseSessionId: {
      ...store.activeByBaseSessionId,
      [baseSession.id]: nextCustomSession.id,
    },
  });
}
