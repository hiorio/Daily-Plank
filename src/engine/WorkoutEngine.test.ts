import { describe, expect, it } from 'vitest';
import { WorkoutSession } from '../domain/workoutSession';
import { WorkoutEngine } from './WorkoutEngine';

const session: WorkoutSession = {
  id: 'test-session',
  title: 'Test session',
  description: 'Test session',
  level: 'BEGINNER',
  totalDurationSeconds: 30,
  steps: [
    { id: 'prepare', type: 'PREPARE', title: 'Prepare', durationSeconds: 5 },
    { id: 'work', type: 'EXERCISE', title: 'Work', exerciseId: 'forearm_plank', durationSeconds: 20 },
    { id: 'finish', type: 'COOLDOWN', title: 'Finish', durationSeconds: 5 },
  ],
};

describe('WorkoutEngine pause accounting', () => {
  it('folds the pending pause duration into elapsed accounting when skipping while paused', () => {
    const engine = new WorkoutEngine();
    engine.startSession(session, 1_000);
    engine.moveToNextStep(session, 2_000);
    engine.pauseSession(5_000);

    const state = engine.moveToNextStep(session, 15_000);

    expect(state.currentStepIndex).toBe(2);
    expect(state.pausedAt).toBeNull();
    expect(state.accumulatedPauseMs).toBe(10_000);
  });

  it('folds the pending pause duration into cancelled records', () => {
    const engine = new WorkoutEngine();
    engine.startSession(session, 1_000);
    engine.pauseSession(4_000);

    const state = engine.cancelSession(9_000);

    expect(state.status).toBe('CANCELLED');
    expect(state.pausedAt).toBeNull();
    expect(state.accumulatedPauseMs).toBe(5_000);
  });
});
