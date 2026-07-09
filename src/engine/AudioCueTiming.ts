import type { WorkoutCue } from '../domain/workoutSession';
import {
  COUNTDOWN_TRACK_MESSAGE,
  COUNTDOWN_TRACK_PLAYBACK_MS,
  COUNTDOWN_TRACK_START_SECONDS,
} from '../domain/countdown';
import { polishSpeechMessage } from './speechText';

export const TIMED_CUE_FIRE_TOLERANCE_MS = 700;
export const COUNTDOWN_CUE_FIRE_TOLERANCE_MS = 1200;

export type TimedCueState = 'PENDING' | 'READY' | 'EXPIRED';
type CountdownCueInput = Pick<WorkoutCue, 'cueType' | 'elapsedSeconds' | 'message' | 'remainingSeconds'>;

export interface ScheduledCountdownCue {
  cue: CountdownCueInput;
  delayMs: number;
  message: string;
  remainingSeconds: number;
  targetAt: number;
}

export function getTimedCueState(
  cue: Pick<WorkoutCue, 'elapsedSeconds' | 'remainingSeconds'>,
  stepStartedAt: number,
  stepEndsAt: number,
  now: number,
  toleranceMs = TIMED_CUE_FIRE_TOLERANCE_MS,
): TimedCueState {
  const triggerAt = getCueTriggerAt(cue, stepStartedAt, stepEndsAt);
  if (triggerAt == null) return 'READY';
  if (now < triggerAt) return 'PENDING';
  if (now > triggerAt + toleranceMs) return 'EXPIRED';
  return 'READY';
}

function getCueTriggerAt(
  cue: Pick<WorkoutCue, 'elapsedSeconds' | 'remainingSeconds'>,
  stepStartedAt: number,
  stepEndsAt: number,
): number | null {
  if (cue.remainingSeconds != null) {
    return stepEndsAt - cue.remainingSeconds * 1000;
  }

  if (cue.elapsedSeconds != null) {
    return stepStartedAt + cue.elapsedSeconds * 1000;
  }

  return null;
}

export function getCountdownCueSchedule(
  cues: CountdownCueInput[],
  stepEndsAt: number,
  now: number,
  toleranceMs = COUNTDOWN_CUE_FIRE_TOLERANCE_MS,
): ScheduledCountdownCue[] {
  if (now >= stepEndsAt) return [];

  const countdownCue = cues.find(
    (cue): cue is CountdownCueInput & { remainingSeconds: number } =>
      cue.cueType === 'VOICE' && isCountdownCueMessage(cue.message, cue.remainingSeconds),
  );
  if (!countdownCue) return [];

  const targetAt = stepEndsAt - COUNTDOWN_TRACK_PLAYBACK_MS;
  if (now < targetAt) {
    return [
      {
        cue: countdownCue,
        delayMs: targetAt - now,
        message: COUNTDOWN_TRACK_MESSAGE,
        remainingSeconds: countdownCue.remainingSeconds,
        targetAt,
      },
    ];
  }

  if (now - targetAt > toleranceMs) return [];

  return [
    {
      cue: countdownCue,
      delayMs: 0,
      message: COUNTDOWN_TRACK_MESSAGE,
      remainingSeconds: countdownCue.remainingSeconds,
      targetAt,
    },
  ];
}

export function isCountdownCueMessage(
  message: string,
  remainingSeconds: number | undefined,
): boolean {
  return (
    remainingSeconds != null &&
    remainingSeconds === COUNTDOWN_TRACK_START_SECONDS &&
    polishSpeechMessage(message) === COUNTDOWN_TRACK_MESSAGE
  );
}
