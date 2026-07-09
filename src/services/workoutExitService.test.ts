import { describe, expect, it } from 'vitest';
import { WorkoutEngineState } from '../engine/WorkoutEngine';
import { WorkoutSession } from '../domain/workoutSession';
import { shouldCompleteWorkoutOnExit } from './workoutExitService';

const session: WorkoutSession = {
  id: 'plank',
  title: '플랭크',
  description: '테스트 세션',
  level: 'BEGINNER',
  totalDurationSeconds: 60,
  steps: [
    { id: 'prepare', type: 'PREPARE', title: '준비', durationSeconds: 5 },
    { id: 'work', type: 'EXERCISE', title: '플랭크', exerciseId: 'forearm_plank', durationSeconds: 40 },
    { id: 'cooldown', type: 'COOLDOWN', title: '마무리 호흡', durationSeconds: 15 },
  ],
};

function stateAt(currentStepIndex: number): WorkoutEngineState {
  return {
    status: 'RUNNING',
    sessionId: session.id,
    currentStepIndex,
    sessionStartedAt: 1_000,
    stepStartedAt: 1_000,
    stepEndsAt: 2_000,
    pausedAt: null,
    accumulatedPauseMs: 0,
    skippedStepCount: 0,
  };
}

describe('shouldCompleteWorkoutOnExit', () => {
  it('completes the workout when exiting during cooldown', () => {
    expect(shouldCompleteWorkoutOnExit(session, stateAt(2))).toBe(true);
  });

  it('keeps early exits cancelled before cooldown', () => {
    expect(shouldCompleteWorkoutOnExit(session, stateAt(1))).toBe(false);
  });
});
