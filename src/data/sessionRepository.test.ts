import { describe, expect, it } from 'vitest';
import {
  COUNTDOWN_TRACK_MESSAGE,
  COUNTDOWN_TRACK_START_SECONDS,
} from '../domain/countdown';
import { workoutSessions } from './sessionRepository';

describe('workoutSessions default voice cues', () => {
  it('adds start messages and one five-second countdown track cue to audible steps', () => {
    for (const session of workoutSessions) {
      for (const step of session.steps) {
        expect(step.startMessage).toBeTruthy();

        if (step.durationSeconds <= 5) continue;

        const voiceCues = step.cues?.filter((cue) => cue.cueType === 'VOICE') ?? [];
        expect(
          voiceCues.filter(
            (cue) =>
              cue.remainingSeconds === COUNTDOWN_TRACK_START_SECONDS &&
              cue.message === COUNTDOWN_TRACK_MESSAGE,
          ),
        ).toHaveLength(1);
        expect(voiceCues.some((cue) => cue.remainingSeconds === 3)).toBe(false);
        expect(voiceCues.some((cue) => cue.remainingSeconds === 2)).toBe(false);
        expect(voiceCues.some((cue) => cue.remainingSeconds === 1)).toBe(false);
      }
    }
  });

  it('keeps ten-second warnings out of prepare, rest, and cooldown steps', () => {
    for (const session of workoutSessions) {
      for (const step of session.steps) {
        if (step.type === 'EXERCISE') continue;
        const voiceCues = step.cues?.filter((cue) => cue.cueType === 'VOICE') ?? [];
        expect(voiceCues.some((cue) => cue.remainingSeconds === 10)).toBe(false);
      }
    }
  });

  it('exposes polite Korean prompts for TTS', () => {
    const voiceMessages = workoutSessions.flatMap((session) =>
      session.steps.flatMap((step) => [
        step.startMessage ?? '',
        ...((step.cues ?? [])
          .filter((cue) => cue.cueType === 'VOICE')
          .map((cue) => cue.message)),
      ]),
    );

    expect(voiceMessages).toContain('10초 남았습니다.');
    expect(voiceMessages).toContain('운동을 준비해 주세요.');
    expect(voiceMessages.filter((message) => /(한다|남았다|이다|쉰다|고른다|완료했다)\.?$/.test(message))).toEqual([]);
  });
});
