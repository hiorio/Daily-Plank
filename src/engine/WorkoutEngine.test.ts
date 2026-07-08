import { describe, expect, it } from 'vitest';
import { WorkoutSession } from '../domain/workoutSession';
import { WorkoutEngine } from './WorkoutEngine';

const session: WorkoutSession = {
  id: 'test_session',
  title: '테스트 세션',
  description: '테스트',
  level: 'BEGINNER',
  totalDurationSeconds: 60,
  steps: [
    { id: 'prepare', type: 'PREPARE', title: '준비', durationSeconds: 10 },
    { id: 'exercise', type: 'EXERCISE', title: '플랭크', durationSeconds: 30 },
    { id: 'cooldown', type: 'COOLDOWN', title: '마무리', durationSeconds: 20 },
  ],
};

describe('WorkoutEngine pause accounting', () => {
  it('accumulates pause time when skipping to the next step while paused', () => {
    const engine = new WorkoutEngine();
    engine.startSession(session, 0);
    engine.pauseSession(5_000);
    const state = engine.moveToNextStep(session, 12_000);

    expect(state.status).toBe('RUNNING');
    expect(state.currentStepIndex).toBe(1);
    expect(state.accumulatedPauseMs).toBe(7_000);
    expect(state.pausedAt).toBeNull();
  });

  it('accumulates pause time when moving to the previous step while paused', () => {
    const engine = new WorkoutEngine();
    engine.startSession(session, 0);
    engine.moveToNextStep(session, 10_000);
    engine.pauseSession(15_000);
    const state = engine.moveToPreviousStep(session, 21_000);

    expect(state.currentStepIndex).toBe(0);
    expect(state.accumulatedPauseMs).toBe(6_000);
    expect(state.pausedAt).toBeNull();
  });

  it('accumulates pause time when cancelling while paused', () => {
    const engine = new WorkoutEngine();
    engine.startSession(session, 0);
    engine.pauseSession(4_000);
    const state = engine.cancelSession(9_000);

    expect(state.status).toBe('CANCELLED');
    expect(state.accumulatedPauseMs).toBe(5_000);
    expect(state.pausedAt).toBeNull();
  });

  it('completes when skipping past the last step and folds in pause time', () => {
    const engine = new WorkoutEngine();
    engine.startSession(session, 0);
    engine.moveToNextStep(session, 1_000);
    engine.moveToNextStep(session, 2_000);
    engine.pauseSession(3_000);
    const state = engine.moveToNextStep(session, 8_000);

    expect(state.status).toBe('COMPLETED');
    expect(state.accumulatedPauseMs).toBe(5_000);
    expect(state.pausedAt).toBeNull();
  });
});
