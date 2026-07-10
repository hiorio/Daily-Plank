import { describe, expect, it } from 'vitest';
import { COUNTDOWN_TRACK_MESSAGE } from '../domain/countdown';
import { plank5Session } from '../data/sessions/plank5';
import { exercises } from '../data/exercises';
import {
  buildGuidedCustomSession,
  getCustomSessionTtsMessages,
  getExerciseStartMessage,
  getNextExerciseMessage,
  replaceExerciseInSession,
} from './sessionGuidanceService';

describe('sessionGuidanceService', () => {
  it('does not announce the next exercise during the initial prepare countdown', () => {
    const session = buildGuidedCustomSession(plank5Session);
    const prepare = session.steps.find((step) => step.type === 'PREPARE');
    const firstExercise = session.steps.find((step) => step.type === 'EXERCISE');

    expect(prepare?.cues?.some((cue) => cue.message === COUNTDOWN_TRACK_MESSAGE)).toBe(true);
    expect(
      prepare?.cues?.some((cue) => cue.message === getNextExerciseMessage(firstExercise?.title ?? '')),
    ).toBe(false);
  });

  it('rebuilds exercise guidance after replacing a routine step', () => {
    const session = replaceExerciseInSession(plank5Session, 'exercise_1', 'high_plank');
    const step = session.steps.find((item) => item.id === 'exercise_1');

    expect(step?.title).toBe('하이 플랭크');
    expect(step?.exerciseId).toBe('high_plank');
    expect(step?.startMessage).toBe('하이 플랭크를 시작해 주세요.');
    expect(step?.cues?.some((cue) => cue.message.includes('니 플랭크'))).toBe(false);
  });

  it('keeps custom sessions internally consistent after duration changes', () => {
    const session = buildGuidedCustomSession({
      ...plank5Session,
      steps: plank5Session.steps.map((step) =>
        step.id === 'rest_1' ? { ...step, durationSeconds: 20 } : step,
      ),
    });
    const rest = session.steps.find((step) => step.id === 'rest_1');
    const total = session.steps.reduce((sum, step) => sum + step.durationSeconds, 0);

    expect(rest?.startMessage).toBe('20초 쉬어 주세요.');
    expect(session.totalDurationSeconds).toBe(total);
  });

  it('includes all selectable exercise templates in the generated TTS catalog', () => {
    const messages = new Set(getCustomSessionTtsMessages());

    for (const exercise of exercises) {
      expect(messages.has(getExerciseStartMessage(exercise.name))).toBe(true);
      expect(messages.has(getNextExerciseMessage(exercise.name))).toBe(true);
    }
  });
});
