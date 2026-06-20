import { describe, expect, it } from 'vitest';
import { exercises } from '../data/exercises';
import { plank5Session } from '../data/sessions/plank5';
import { WorkoutSession } from '../domain/workoutSession';
import { validateWorkoutSession } from './validation';

function cloneSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    ...plank5Session,
    steps: plank5Session.steps.map((step) => ({ ...step })),
    ...overrides,
  };
}

describe('validateWorkoutSession', () => {
  it('accepts a valid session where step durations match the total', () => {
    expect(() => validateWorkoutSession(plank5Session, exercises)).not.toThrow();
  });

  it('rejects duplicate step ids', () => {
    const session = cloneSession();
    session.steps[1] = { ...session.steps[1]!, id: session.steps[0]!.id };

    expect(() => validateWorkoutSession(session, exercises)).toThrow(/Duplicate workout step id/);
  });

  it('rejects undefined exercise ids', () => {
    const session = cloneSession();
    session.steps[1] = { ...session.steps[1]!, exerciseId: 'missing_exercise' };

    expect(() => validateWorkoutSession(session, exercises)).toThrow(/Unknown exercise id/);
  });

  it('rejects invalid step durations', () => {
    const session = cloneSession();
    session.steps[0] = { ...session.steps[0]!, durationSeconds: 0 };

    expect(() => validateWorkoutSession(session, exercises)).toThrow(/at least 1 second/);
  });

  it('rejects duration mismatches', () => {
    const session = cloneSession({ totalDurationSeconds: 299 });

    expect(() => validateWorkoutSession(session, exercises)).toThrow(/duration mismatch/);
  });
});
