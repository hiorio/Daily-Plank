import { describe, expect, it } from 'vitest';
import {
  COUNTDOWN_CUE_FIRE_TOLERANCE_MS,
  getCountdownCueSchedule,
  getTimedCueState,
} from './AudioCueTiming';
import {
  COUNTDOWN_TRACK_MESSAGE,
  COUNTDOWN_TRACK_START_SECONDS,
} from '../domain/countdown';

describe('getTimedCueState', () => {
  it('keeps remaining-time cues pending until their exact trigger window', () => {
    const cue = { remainingSeconds: 10 };

    expect(getTimedCueState(cue, 0, 30_000, 19_000)).toBe('PENDING');
    expect(getTimedCueState(cue, 0, 30_000, 20_250)).toBe('READY');
  });

  it('expires stale remaining-time cues instead of speaking them late', () => {
    const cue = { remainingSeconds: 10 };

    expect(getTimedCueState(cue, 0, 30_000, 20_701)).toBe('EXPIRED');
  });

  it('allows a wider timing window for countdown track cues', () => {
    const cue = { remainingSeconds: COUNTDOWN_TRACK_START_SECONDS };

    expect(getTimedCueState(cue, 0, 30_000, 25_950, COUNTDOWN_CUE_FIRE_TOLERANCE_MS)).toBe(
      'READY',
    );
  });

  it('expires stale elapsed-time cues so guide prompts do not pile up', () => {
    const cue = { elapsedSeconds: 3 };

    expect(getTimedCueState(cue, 0, 30_000, 2_999)).toBe('PENDING');
    expect(getTimedCueState(cue, 0, 30_000, 3_500)).toBe('READY');
    expect(getTimedCueState(cue, 0, 30_000, 3_701)).toBe('EXPIRED');
  });

  it('schedules one 5 second countdown track at the countdown boundary', () => {
    const cues = [
      {
        remainingSeconds: COUNTDOWN_TRACK_START_SECONDS,
        message: COUNTDOWN_TRACK_MESSAGE,
        cueType: 'VOICE' as const,
      },
    ];

    const schedule = getCountdownCueSchedule(cues, 10_000, 5_000);

    expect(schedule).toHaveLength(1);
    expect(schedule[0]!).toMatchObject({
      delayMs: 0,
      message: COUNTDOWN_TRACK_MESSAGE,
      remainingSeconds: COUNTDOWN_TRACK_START_SECONDS,
      seekOffsetMs: 0,
      targetAt: 5_000,
    });
  });

  it('uses seek offset when the countdown track starts slightly late', () => {
    const cues = [
      {
        remainingSeconds: COUNTDOWN_TRACK_START_SECONDS,
        message: COUNTDOWN_TRACK_MESSAGE,
        cueType: 'VOICE' as const,
      },
    ];

    const schedule = getCountdownCueSchedule(cues, 10_000, 5_250);

    expect(schedule).toHaveLength(1);
    expect(schedule[0]!.seekOffsetMs).toBe(250);
  });

  it('does not start a stale countdown track too late', () => {
    const cues = [
      {
        remainingSeconds: COUNTDOWN_TRACK_START_SECONDS,
        message: COUNTDOWN_TRACK_MESSAGE,
        cueType: 'VOICE' as const,
      },
    ];

    expect(getCountdownCueSchedule(cues, 10_000, 6_500)).toEqual([]);
  });
});
