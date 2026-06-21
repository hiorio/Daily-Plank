import { describe, expect, it } from 'vitest';
import { workoutSessions } from './sessionRepository';

describe('workoutSessions default voice cues', () => {
  it('adds start messages, five-second warnings, and countdown cues to audible steps', () => {
    for (const session of workoutSessions) {
      for (const step of session.steps) {
        expect(step.startMessage).toBeTruthy();

        if (step.durationSeconds <= 5) continue;

        const voiceCues = step.cues?.filter((cue) => cue.cueType === 'VOICE') ?? [];
        expect(voiceCues.some((cue) => cue.remainingSeconds === 5)).toBe(true);
        expect(voiceCues.some((cue) => cue.remainingSeconds === 3)).toBe(true);
        expect(voiceCues.some((cue) => cue.remainingSeconds === 2)).toBe(true);
        expect(voiceCues.some((cue) => cue.remainingSeconds === 1)).toBe(true);
      }
    }
  });
});
